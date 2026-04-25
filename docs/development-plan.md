# Development Plan

## Phase 1: Scaffold and Boundaries

1. Create the Tauri desktop app shell.
2. Create the Vercel license admin shell.
3. Define shared package boundaries for calculation, reporting, storage, and GHG Protocol guidance.
4. Keep existing web app files untouched.

## Phase 2: Local Scope 1/2 Calculator

1. Move or copy Scope 1/2 constants and deterministic calculation logic into `packages/core`.
2. Standardize on Korean UI text.
3. Hide Scope 3 calculation UI and expose an individual inquiry panel.
4. Preserve Excel import/export behavior where applicable.

## Phase 3: Local Storage

1. Use SQLite as the primary local database.
2. Add `.ghgproj` export/import for backup, transfer, and optional Google Drive storage.
3. Add local autosave and local version snapshots.

## Phase 4: Reporting

1. Build a single `ReportData` model.
2. Implement a Chapter 9 compliance checklist before report generation.
3. Generate HTML preview, Word `.docx`, and PDF from the same data.
4. Include organization boundary, operational boundary, reporting period, Scope 1/2 totals, gas-level totals, methodology, emission factor sources, exclusions, base-year policy, verification status, and contact information.

## Phase 5: Updates and Licensing

1. Add Tauri updater metadata support.
2. Support optional updates and forced updates via `minimumSupportedVersion`.
3. Build a Vercel-hosted license admin app for customers, license keys, expiration, blocked state, device count, and update metadata.
4. Ensure the desktop app sends only license/device/version metadata, never calculation data.

## Phase 6: Packaging

1. Build Windows installer artifacts.
2. Add code signing when commercial distribution starts.
3. Defer macOS packaging until requested.
