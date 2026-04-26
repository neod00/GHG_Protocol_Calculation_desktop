use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::{fs, path::PathBuf};
use tauri::{AppHandle, Manager};

const DATABASE_FILE_NAME: &str = "ghg-desktop.sqlite3";
const LAST_PROJECT_KEY: &str = "last_project_id";
const PROJECT_BUNDLE_EXTENSION: &str = "ghgproj";
const CSV_EXTENSION: &str = "csv";

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

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ProjectBundleFile {
    file_name: String,
    file_path: String,
    updated_at: String,
}

fn get_string(value: &serde_json::Value, path: &[&str]) -> String {
    let mut current = value;
    for segment in path {
        current = match current.get(*segment) {
            Some(next) => next,
            None => return String::new(),
        };
    }

    current.as_str().unwrap_or_default().to_string()
}

fn get_string_array(value: &serde_json::Value, path: &[&str]) -> Vec<String> {
    let mut current = value;
    for segment in path {
        current = match current.get(*segment) {
            Some(next) => next,
            None => return Vec::new(),
        };
    }

    current
        .as_array()
        .map(|items| {
            items
                .iter()
                .filter_map(|item| item.as_str().map(|text| text.to_string()))
                .collect::<Vec<_>>()
        })
        .unwrap_or_default()
}

fn build_pdf_output_path(app: &AppHandle, file_name: &str) -> Result<PathBuf, String> {
    let downloads_dir = downloads_dir(app)?;
    Ok(downloads_dir.join(sanitize_file_name(file_name)))
}

fn windows_font_dir() -> PathBuf {
    PathBuf::from(r"C:\Windows\Fonts")
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

fn report_output_path(app: &AppHandle, file_name: &str) -> Result<PathBuf, String> {
    let downloads_dir = app
        .path()
        .download_dir()
        .or_else(|_| app.path().document_dir())
        .map_err(|error| format!("failed to resolve report output directory: {error}"))?;

    fs::create_dir_all(&downloads_dir)
        .map_err(|error| format!("failed to create report output directory: {error}"))?;

    Ok(downloads_dir.join(file_name))
}

fn downloads_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let downloads_dir = app
        .path()
        .download_dir()
        .or_else(|_| app.path().document_dir())
        .map_err(|error| format!("failed to resolve downloads directory: {error}"))?;

    fs::create_dir_all(&downloads_dir)
        .map_err(|error| format!("failed to create downloads directory: {error}"))?;

    Ok(downloads_dir)
}

fn sanitize_file_name(value: &str) -> String {
    value.replace(['\\', '/', ':', '*', '?', '"', '<', '>', '|'], "_")
}

#[tauri::command]
fn save_csv_file(app: AppHandle, file_name: String, content: String) -> Result<String, String> {
    let downloads_dir = downloads_dir(&app)?;
    let output_path = downloads_dir.join(sanitize_file_name(&file_name));

    fs::write(&output_path, content).map_err(|error| format!("failed to write csv file: {error}"))?;

    output_path
        .to_str()
        .map(|value| value.to_string())
        .ok_or_else(|| "failed to convert csv path to string".to_string())
}

#[tauri::command]
fn list_csv_files(app: AppHandle) -> Result<Vec<ProjectBundleFile>, String> {
    let downloads_dir = downloads_dir(&app)?;
    let mut files = Vec::new();

    for entry in fs::read_dir(downloads_dir).map_err(|error| format!("failed to read downloads directory: {error}"))? {
        let entry = entry.map_err(|error| format!("failed to read downloads entry: {error}"))?;
        let path = entry.path();
        let extension = path.extension().and_then(|value| value.to_str()).unwrap_or_default();

        if extension.to_ascii_lowercase() != CSV_EXTENSION {
            continue;
        }

        let metadata = entry
            .metadata()
            .map_err(|error| format!("failed to read csv metadata: {error}"))?;
        let modified = metadata
            .modified()
            .map_err(|error| format!("failed to read csv modified time: {error}"))?;
        let updated_at: chrono::DateTime<chrono::Utc> = modified.into();

        files.push(ProjectBundleFile {
            file_name: path
                .file_name()
                .and_then(|value| value.to_str())
                .unwrap_or_default()
                .to_string(),
            file_path: path.to_string_lossy().to_string(),
            updated_at: updated_at.to_rfc3339(),
        });
    }

    files.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
    Ok(files)
}

#[tauri::command]
fn read_csv_file(app: AppHandle, file_name: String) -> Result<String, String> {
    let downloads_dir = downloads_dir(&app)?;
    let input_path = downloads_dir.join(sanitize_file_name(&file_name));
    fs::read_to_string(&input_path).map_err(|error| format!("failed to read csv file: {error}"))
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

#[tauri::command]
fn save_generated_report(app: AppHandle, file_name: String, bytes: Vec<u8>) -> Result<String, String> {
    let sanitized_file_name = sanitize_file_name(&file_name);
    let output_path = report_output_path(&app, &sanitized_file_name)?;

    fs::write(&output_path, bytes).map_err(|error| format!("failed to write generated report: {error}"))?;

    output_path
        .to_str()
        .map(|value| value.to_string())
        .ok_or_else(|| "failed to convert report path to string".to_string())
}

#[tauri::command]
fn save_generated_pdf(app: AppHandle, file_name: String, report_data: serde_json::Value) -> Result<String, String> {
    let output_path = build_pdf_output_path(&app, &file_name)?;
    let font_family = genpdf::fonts::from_files(windows_font_dir(), "malgun", None)
        .map_err(|error| format!("failed to load Windows fonts for PDF generation: {error}"))?;

    let mut doc = genpdf::Document::new(font_family);
    doc.set_title("온실가스 배출량 보고서");
    doc.set_minimal_conformance();
    doc.set_line_spacing(1.25);

    let mut decorator = genpdf::SimplePageDecorator::new();
    decorator.set_margins(18);
    doc.set_page_decorator(decorator);

    let cover_title = genpdf::elements::Paragraph::new(format!(
        "{} 온실가스 배출량 보고서",
        get_string(&report_data, &["boundary", "companyName"])
    ));
    doc.push(genpdf::elements::StyledElement::new(
        cover_title.aligned(genpdf::Alignment::Center),
        genpdf::style::Style::new().bold().with_font_size(22),
    ));

    let meta = genpdf::elements::Paragraph::new(format!(
        "보고연도 {} | 보고기간 {} | 접근법 {}",
        get_string(&report_data, &["boundary", "reportingYear"]),
        get_string(&report_data, &["reportingPeriod"]),
        get_string(&report_data, &["boundary", "consolidationApproach"])
    ));
    doc.push(meta.aligned(genpdf::Alignment::Center));
    doc.push(genpdf::elements::Break::new(1));

    doc.push(genpdf::elements::StyledElement::new(
        genpdf::elements::Paragraph::new("배출량 요약"),
        genpdf::style::Style::new().bold().with_font_size(16),
    ));

    let summary_items = [
        ("Scope 1", get_string(&report_data, &["totals", "scope1Tco2e"])),
        ("Scope 2 Location", get_string(&report_data, &["totals", "scope2LocationTco2e"])),
        ("Scope 2 Market", get_string(&report_data, &["totals", "scope2MarketTco2e"])),
        ("총배출량 Location", get_string(&report_data, &["totals", "totalLocationTco2e"])),
        ("총배출량 Market", get_string(&report_data, &["totals", "totalMarketTco2e"])),
    ];

    for (label, value) in summary_items {
        doc.push(genpdf::elements::Paragraph::new(format!("{label}: {value} tCO2e")));
    }

    doc.push(genpdf::elements::Break::new(1));

    doc.push(genpdf::elements::StyledElement::new(
        genpdf::elements::Paragraph::new("기업 및 인벤토리 경계"),
        genpdf::style::Style::new().bold().with_font_size(16),
    ));
    doc.push(genpdf::elements::Paragraph::new(format!(
        "조직 경계: {}",
        get_string(&report_data, &["inventoryBoundary", "organizationalBoundarySummary"])
    )));
    doc.push(genpdf::elements::Paragraph::new(format!(
        "운영 경계: {}",
        get_string(&report_data, &["inventoryBoundary", "operationalBoundarySummary"])
    )));
    for item in get_string_array(&report_data, &["inventoryBoundary", "excludedActivities"]) {
        doc.push(genpdf::elements::BulletPoint::new(genpdf::elements::Paragraph::new(item)));
    }

    doc.push(genpdf::elements::Break::new(1));

    doc.push(genpdf::elements::StyledElement::new(
        genpdf::elements::Paragraph::new("산정 방법론 및 배출계수"),
        genpdf::style::Style::new().bold().with_font_size(16),
    ));
    doc.push(genpdf::elements::Paragraph::new(get_string(
        &report_data,
        &["methodology", "calculationMethodSummary"],
    )));
    for item in get_string_array(&report_data, &["methodology", "emissionFactorSources"]) {
        doc.push(genpdf::elements::BulletPoint::new(genpdf::elements::Paragraph::new(format!("배출계수 출처: {item}"))));
    }
    for item in get_string_array(&report_data, &["methodology", "dataQualityNotes"]) {
        doc.push(genpdf::elements::BulletPoint::new(genpdf::elements::Paragraph::new(format!("데이터 품질: {item}"))));
    }
    for item in get_string_array(&report_data, &["methodology", "uncertaintyNotes"]) {
        doc.push(genpdf::elements::BulletPoint::new(genpdf::elements::Paragraph::new(format!("불확실성: {item}"))));
    }

    doc.push(genpdf::elements::Break::new(1));

    doc.push(genpdf::elements::StyledElement::new(
        genpdf::elements::Paragraph::new("기준연도 및 재산정 정책"),
        genpdf::style::Style::new().bold().with_font_size(16),
    ));
    doc.push(genpdf::elements::Paragraph::new(format!(
        "기준연도 선정 사유: {}",
        get_string(&report_data, &["baseYearPolicy", "baseYearSelectionReason"])
    )));
    doc.push(genpdf::elements::Paragraph::new(format!(
        "재산정 정책: {}",
        get_string(&report_data, &["baseYearPolicy", "recalculationPolicy"])
    )));

    doc.push(genpdf::elements::Break::new(1));

    doc.push(genpdf::elements::StyledElement::new(
        genpdf::elements::Paragraph::new("검증 및 담당자"),
        genpdf::style::Style::new().bold().with_font_size(16),
    ));
    doc.push(genpdf::elements::Paragraph::new(format!(
        "검증 상태: {}",
        get_string(&report_data, &["verification", "status"])
    )));
    doc.push(genpdf::elements::Paragraph::new(format!(
        "검증 기준: {}",
        get_string(&report_data, &["verification", "verificationStandard"])
    )));
    doc.push(genpdf::elements::Paragraph::new(format!(
        "검증 의견: {}",
        get_string(&report_data, &["verification", "verificationOpinion"])
    )));
    doc.push(genpdf::elements::Paragraph::new(format!(
        "담당자: {} {}",
        get_string(&report_data, &["contact", "department"]),
        get_string(&report_data, &["contact", "name"])
    )));

    doc.push(genpdf::elements::PageBreak::new());

    doc.push(genpdf::elements::StyledElement::new(
        genpdf::elements::Paragraph::new("부록 A. 배출원 상세"),
        genpdf::style::Style::new().bold().with_font_size(16),
    ));

    if let Some(items) = report_data.get("sources").and_then(|value| value.as_array()) {
        for item in items {
            doc.push(genpdf::elements::Paragraph::new(format!(
                "{} | {} | {} | {} | {} tCO2e",
                item.get("description").and_then(|v| v.as_str()).unwrap_or_default(),
                item.get("category").and_then(|v| v.as_str()).unwrap_or_default(),
                item.get("fuelType").and_then(|v| v.as_str()).unwrap_or_default(),
                item.get("unit").and_then(|v| v.as_str()).unwrap_or_default(),
                item.get("emissionsTCO2e").and_then(|v| v.as_f64()).unwrap_or_default()
            )));
        }
    }

    doc.render_to_file(&output_path)
        .map_err(|error| format!("failed to render PDF file: {error}"))?;

    output_path
        .to_str()
        .map(|value| value.to_string())
        .ok_or_else(|| "failed to convert PDF path to string".to_string())
}

#[tauri::command]
fn export_project_bundle(app: AppHandle, project: ProjectEnvelope) -> Result<String, String> {
    let downloads_dir = downloads_dir(&app)?;
    let payload_json =
        serde_json::to_string_pretty(&project).map_err(|error| format!("failed to serialize project bundle: {error}"))?;

    let safe_project_name = sanitize_file_name(&project.project_name);
    let file_name = format!("{}_{}.{}", safe_project_name, project.updated_at[..10].replace('-', ""), PROJECT_BUNDLE_EXTENSION);
    let output_path = downloads_dir.join(file_name);

    fs::write(&output_path, payload_json).map_err(|error| format!("failed to write project bundle: {error}"))?;

    output_path
        .to_str()
        .map(|value| value.to_string())
        .ok_or_else(|| "failed to convert project bundle path to string".to_string())
}

#[tauri::command]
fn list_project_bundle_files(app: AppHandle) -> Result<Vec<ProjectBundleFile>, String> {
    let downloads_dir = downloads_dir(&app)?;
    let mut files = Vec::new();

    for entry in fs::read_dir(downloads_dir).map_err(|error| format!("failed to read downloads directory: {error}"))? {
        let entry = entry.map_err(|error| format!("failed to read downloads entry: {error}"))?;
        let path = entry.path();
        let extension = path.extension().and_then(|value| value.to_str()).unwrap_or_default();

        if extension != PROJECT_BUNDLE_EXTENSION {
            continue;
        }

        let metadata = entry
            .metadata()
            .map_err(|error| format!("failed to read project bundle metadata: {error}"))?;
        let modified = metadata
            .modified()
            .map_err(|error| format!("failed to read project bundle modified time: {error}"))?;
        let updated_at: chrono::DateTime<chrono::Utc> = modified.into();

        files.push(ProjectBundleFile {
            file_name: path
                .file_name()
                .and_then(|value| value.to_str())
                .unwrap_or_default()
                .to_string(),
            file_path: path.to_string_lossy().to_string(),
            updated_at: updated_at.to_rfc3339(),
        });
    }

    files.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
    Ok(files)
}

#[tauri::command]
fn import_project_bundle(app: AppHandle, file_name: String) -> Result<ProjectEnvelope, String> {
    let downloads_dir = downloads_dir(&app)?;
    let safe_file_name = sanitize_file_name(&file_name);
    let input_path = downloads_dir.join(safe_file_name);

    let payload_json =
        fs::read_to_string(&input_path).map_err(|error| format!("failed to read project bundle: {error}"))?;
    let project: ProjectEnvelope = serde_json::from_str(&payload_json)
        .map_err(|error| format!("failed to deserialize project bundle: {error}"))?;

    save_project(app, project.clone())?;
    Ok(project)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            save_project,
            load_project,
            list_projects,
            load_last_project,
            save_csv_file,
            list_csv_files,
            read_csv_file,
            save_generated_report,
            save_generated_pdf,
            export_project_bundle,
            list_project_bundle_files,
            import_project_bundle
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
