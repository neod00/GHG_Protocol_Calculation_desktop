use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::{fs, path::PathBuf};
use tauri::{AppHandle, Manager};

const DATABASE_FILE_NAME: &str = "ghg-desktop.sqlite3";
const LAST_PROJECT_KEY: &str = "last_project_id";

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ProjectEnvelope {
    schema_version: i64,
    app_version: String,
    project_id: String,
    project_name: String,
    updated_at: String,
    data: serde_json::Value,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ProjectListItem {
    project_id: String,
    project_name: String,
    updated_at: String,
}

fn database_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("failed to resolve app data directory: {error}"))?;

    fs::create_dir_all(&app_data_dir)
        .map_err(|error| format!("failed to create app data directory: {error}"))?;

    Ok(app_data_dir.join(DATABASE_FILE_NAME))
}

fn open_database(app: &AppHandle) -> Result<Connection, String> {
    let path = database_path(app)?;
    let connection =
        Connection::open(path).map_err(|error| format!("failed to open sqlite database: {error}"))?;

    connection
        .execute_batch(
            "
            CREATE TABLE IF NOT EXISTS projects (
              project_id TEXT PRIMARY KEY,
              project_name TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              payload_json TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS app_state (
              state_key TEXT PRIMARY KEY,
              state_value TEXT NOT NULL
            );
            ",
        )
        .map_err(|error| format!("failed to initialize sqlite schema: {error}"))?;

    Ok(connection)
}

#[tauri::command]
fn save_project(app: AppHandle, project: ProjectEnvelope) -> Result<(), String> {
    let connection = open_database(&app)?;
    let payload_json =
        serde_json::to_string(&project).map_err(|error| format!("failed to serialize project: {error}"))?;

    connection
        .execute(
            "
            INSERT INTO projects (project_id, project_name, updated_at, payload_json)
            VALUES (?1, ?2, ?3, ?4)
            ON CONFLICT(project_id) DO UPDATE SET
              project_name = excluded.project_name,
              updated_at = excluded.updated_at,
              payload_json = excluded.payload_json
            ",
            params![
                project.project_id,
                project.project_name,
                project.updated_at,
                payload_json
            ],
        )
        .map_err(|error| format!("failed to save project: {error}"))?;

    connection
        .execute(
            "
            INSERT INTO app_state (state_key, state_value)
            VALUES (?1, ?2)
            ON CONFLICT(state_key) DO UPDATE SET
              state_value = excluded.state_value
            ",
            params![LAST_PROJECT_KEY, project.project_id],
        )
        .map_err(|error| format!("failed to save last project pointer: {error}"))?;

    Ok(())
}

#[tauri::command]
fn load_project(app: AppHandle, project_id: String) -> Result<Option<ProjectEnvelope>, String> {
    let connection = open_database(&app)?;
    let mut statement = connection
        .prepare("SELECT payload_json FROM projects WHERE project_id = ?1")
        .map_err(|error| format!("failed to prepare load query: {error}"))?;

    let mut rows = statement
        .query(params![project_id])
        .map_err(|error| format!("failed to execute load query: {error}"))?;

    let Some(row) = rows
        .next()
        .map_err(|error| format!("failed to read load query row: {error}"))?
    else {
        return Ok(None);
    };

    let payload_json: String = row
        .get(0)
        .map_err(|error| format!("failed to read project payload: {error}"))?;

    let project: ProjectEnvelope = serde_json::from_str(&payload_json)
        .map_err(|error| format!("failed to deserialize project payload: {error}"))?;

    Ok(Some(project))
}

#[tauri::command]
fn list_projects(app: AppHandle) -> Result<Vec<ProjectListItem>, String> {
    let connection = open_database(&app)?;
    let mut statement = connection
        .prepare(
            "
            SELECT project_id, project_name, updated_at
            FROM projects
            ORDER BY updated_at DESC
            ",
        )
        .map_err(|error| format!("failed to prepare list query: {error}"))?;

    let rows = statement
        .query_map([], |row| {
            Ok(ProjectListItem {
                project_id: row.get(0)?,
                project_name: row.get(1)?,
                updated_at: row.get(2)?,
            })
        })
        .map_err(|error| format!("failed to execute list query: {error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("failed to collect project list: {error}"))
}

#[tauri::command]
fn load_last_project(app: AppHandle) -> Result<Option<ProjectEnvelope>, String> {
    let connection = open_database(&app)?;
    let project_id: Option<String> = connection
        .query_row(
            "SELECT state_value FROM app_state WHERE state_key = ?1",
            params![LAST_PROJECT_KEY],
            |row| row.get(0),
        )
        .ok();

    let Some(project_id) = project_id else {
        return Ok(None);
    };

    load_project(app, project_id)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            save_project,
            load_project,
            list_projects,
            load_last_project
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
