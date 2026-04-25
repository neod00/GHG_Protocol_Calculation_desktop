# Local SQLite Storage

The desktop app now persists project data to a local SQLite database through Tauri commands.

## Storage location

- Base directory: Tauri app data directory
- Database file: `ghg-desktop.sqlite3`

On Windows this will be created under the current user's local app data area for:

- `com.openbrain.ghgdesktop`

## Stored data

- Project id
- Project name
- Updated timestamp
- Serialized project payload
- Last opened project id

## Stored project payload

- Company name
- Reporting year
- Boundary approach
- Facilities
- Scope 1 and Scope 2 emission sources
- Monthly activity quantities

## Current behavior

- The app loads the last opened project on startup
- The app auto-saves after edits with a short delay
- The user can manually save immediately
- The recent project list is read from local SQLite
