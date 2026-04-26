# Web-to-Desktop Parity Plan

## Goal

The desktop app must feel and behave like the existing deployed web app, while replacing cloud storage and account-dependent features with local-first desktop equivalents.

The current desktop implementation is a useful technical scaffold, but it is not yet the same product experience as the web app. Before committing the current changes, the desktop roadmap should be realigned around parity with the web app.

## Source of Truth

- Web app repo: `D:\OneDrive\Business\ai automation\GHG_Calculator\ghg-protocol-scope-1,2,3-calculator\ghg-saas`
- Desktop repo: `D:\OneDrive\Business\ai automation\GHG_Calculator\ghg-desktop`
- Web app primary UI entry: `src/components/MainCalculator.tsx`
- Desktop primary UI entry today: `apps/desktop/src/main.tsx`

## Product Rules

- Scope 1 and Scope 2 must be available.
- Scope 3 calculation is not part of the standard desktop product. Scope 3 UI should show individual inquiry/contact guidance.
- Sensitive user activity data must stay local by default.
- Local persistence should use SQLite.
- `.ghgproj` export/import remains the desktop project backup format.
- License verification and update checks may call the Vercel license server.
- Emissions activity data, facility data, calculation results, and report draft data must not be sent to the license server.
- Word, PDF, and HTML reports must remain part of the desktop product.
- Report content must follow GHG Protocol Korean Chapter 9 requirements.

## Current Gap Summary

### 1. UI Structure

Web app:
- Uses a dashboard-style calculator centered around `MainCalculator`.
- Uses `ResultsDisplay`, `Scope1Calculator`, `Scope2Calculator`, `Scope3Calculator`, `EmissionSourceCard`, `FactorManager`, `BoundarySetupWizard`, `ReportGenerator`, `ExcelUploadModal`, and `VersionHistoryModal`.
- Uses Tailwind-based visual language, teal/emerald accents, segmented tabs, hero result cards, charts, and modal workflows.

Desktop app today:
- Uses a mostly custom single-file UI in `apps/desktop/src/main.tsx`.
- Uses sidebar navigation and simplified source table.
- Does not yet reuse the web app calculator components.

Decision:
- Rebuild the desktop app shell around the web app calculator experience instead of continuing the simplified desktop-only UI.

### 2. Initial Setup and Boundary Configuration

Web app:
- Starts with `BoundarySetupWizard`.
- Captures company name, reporting year, facilities, equity share, facility grouping, boundary approach, and Scope 3 settings.
- Allows reconfiguration later.

Desktop app today:
- Starts with default company/facility data.
- Has simple project metadata fields.
- No equivalent wizard flow.

Desktop target:
- Port `BoundarySetupWizard` behavior.
- Remove web-only authentication dependencies.
- Replace Scope 3 enablement with "individual inquiry" messaging.
- Persist setup into SQLite and `.ghgproj`.

### 3. Scope 1/2 Input Experience

Web app:
- Uses `Scope1Calculator` and `Scope2Calculator`.
- Uses `EmissionSourceCard` for category-level expandable input.
- Supports monthly quantities, facility assignment, fuel/unit selection, formulas, audit mode, data source fields, and category descriptions.

Desktop app today:
- Uses a simplified annual quantity source table.
- Lacks the same category card UX.
- Lacks full audit mode behavior.

Desktop target:
- Port `Scope1Calculator`, `Scope2Calculator`, and `EmissionSourceCard`.
- Keep Scope 1 categories:
  - Stationary Combustion
  - Mobile Combustion
  - Process Emissions
  - Fugitive Emissions
  - Waste
- Keep Scope 2 category:
  - Purchased Energy
- Preserve monthly input and source-level formula display.
- Preserve audit mode for GHG Protocol transparency.

### 4. Results Display

Web app:
- Uses `ResultsDisplay`.
- Shows location-based total, market-based total, Scope 1, Scope 2 location, Scope 2 market, and Scope 3 totals.
- Uses charts via `recharts`.
- Includes facility breakdown and report-generation entry point.

Desktop app today:
- Shows simple metric cards only.
- No chart parity.
- Scope 3 is omitted from calculation.

Desktop target:
- Port `ResultsDisplay` design and layout.
- For standard desktop:
  - Show Scope 1 and Scope 2 results.
  - Show Scope 3 as locked/contact-only, not as a normal calculated total.
- Keep facility breakdown.
- Keep report generation action.

### 5. Emission Factor Management

Web app:
- Uses `FactorManager`.
- Supports default factors, custom factors, editing, search/filter, CSV import/export, pending changes, and regional electricity factor selection.

Desktop app today:
- Uses fixed default factors from `@ghg/core`.
- No full factor manager UI.

Desktop target:
- Port `FactorManager` for Scope 1 and Scope 2.
- Remove or hide Scope 3 factor tabs from the standard desktop build.
- Persist custom Scope 1/2 factors locally.
- Include factor data in `.ghgproj` backups.

### 6. Excel Import and Export

Web app:
- Supports Excel export via `src/utils/excelExport.ts`.
- Supports Excel import via `ExcelUploadModal` and `src/utils/excelImport.ts`.

Desktop app today:
- Has Word/PDF report export but not Excel import/export.

Desktop target:
- Port Excel export/import for Scope 1/2 project data.
- Save generated files via Tauri filesystem commands.
- Ensure Excel import does not require cloud upload.

Progress:
- Added Excel-compatible Scope 1/2 CSV template export and current data export to the local Downloads folder.
- Added local Downloads CSV listing and import flow that replaces the current Scope 1/2 source list after validation.
- CSV import/export uses local Tauri file commands only; no activity data is sent to the license server.
- Added native `.xlsx` template export, current data export, local Downloads listing, and import flow using the desktop app's local file commands.
- Follow-up: `exceljs` leaves a moderate transitive `uuid` audit warning; do not apply `npm audit fix --force` without review because it downgrades ExcelJS. Consider code-splitting Excel utilities because the desktop frontend bundle increased.

### 7. Report Generation

Web app:
- Uses `ReportGenerator` modal.
- Existing report behavior is useful but not enough for the new desktop reporting goal.

Desktop app today:
- Has stronger Chapter 9 report model.
- Supports HTML preview, Word export, and PDF export.
- Has required/optional checklist grouping.

Desktop target:
- Keep the desktop Chapter 9 report model and Word/PDF/HTML exports.
- Integrate report entry point into the web-style `ResultsDisplay` flow.
- Preserve GHG Protocol Chapter 9 required/optional checklist.
- Improve visual design while staying consistent with the web dashboard style.

### 8. Storage

Web app:
- Uses Supabase/server actions for project save/version history.
- Uses localStorage for some temporary user data.

Desktop app today:
- Uses SQLite through Tauri commands.
- Supports `.ghgproj` backup/import.
- Browser fallback was added for validation only.

Desktop target:
- Keep SQLite and `.ghgproj`.
- Replace `handleSaveToCloud` with local save.
- Replace web version history with local project snapshots if needed.
- Do not send sensitive data externally.

### 9. License and Updates

Web app:
- Uses login/auth and organization/project concepts.

Desktop app today:
- Has Vercel license verification and update metadata endpoints.
- Has license gating.

Desktop target:
- Keep license server integration.
- License server receives only license/update identifiers.
- Keep forced update support.
- Do not mix license admin web app with user data storage.

### 10. Visual Design

Web app:
- Tailwind-based, modern dashboard UI.
- Uses rounded cards, segmented controls, emerald/teal accents, charts, modal workflows, and dark mode support.

Desktop app today:
- Separate CSS design with sidebar, simple tables, and different visual hierarchy.

Desktop target:
- Reuse the web visual system as much as possible.
- Desktop may add a local project bar, license status, backup/export controls, and update notices.
- Avoid a totally separate UI language.

## Implementation Strategy

### Phase 1: Desktop Parity Foundation

1. Add Tailwind/Vite styling support in the desktop app if needed.
2. Copy or port shared web UI components into desktop:
   - `ResultsDisplay`
   - `Scope1Calculator`
   - `Scope2Calculator`
   - `EmissionSourceCard`
   - `BoundarySetupWizard`
   - `FactorManager`
   - `ExcelUploadModal`
3. Create desktop adapters for:
   - local project save/load
   - local factor persistence
   - local Excel import/export
   - report generation
   - license gating

Progress:
- `DesktopResultsDisplay` has been added as the first web-style result dashboard.
- `DesktopScopeCalculators` and `DesktopEmissionSourceCard` have been added as the first Scope 1/2 card-style input surface.
- Scope 2 market-based controls for PPA, REC, green premium, and conventional power have been moved into the card-style input surface.
- The old simplified source table has been removed from `apps/desktop/src/main.tsx`.

### Phase 2: Scope 1/2 Calculation Parity

1. Align desktop `@ghg/core` constants with the web app Scope 1/2 constants.
2. Align calculation formulas and results with the web app behavior.
3. Keep Scope 3 enum/types if useful, but hide standard Scope 3 calculation UI.
4. Add regression tests comparing representative Scope 1/2 inputs against expected totals.

Progress:
- Added `@ghg/core` Scope 1/2 regression tests for stationary combustion, mobile combustion, fugitive emissions, Scope 2 location-based electricity, Scope 2 market-based power mix, and equity boundary adjustment.
- Added root `npm run test:core` script for repeatable core calculation verification.
- Confirmed desktop Scope 1/2 factor constants match the web app source files by SHA-256 hash.
- Added a desktop Scope 1/2 factor manager for viewing/editing local factors, adding custom factors, resetting defaults, and saving the factor set inside the local project data.

### Phase 3: Report Integration

1. Connect web-style result dashboard to desktop Chapter 9 report generator.
2. Keep Word/PDF/HTML exports.
3. Add report preview entry from the result dashboard.
4. Ensure report uses local project and local factor metadata.

### Phase 4: Local Project Productization

1. Replace cloud save/version UX with:
   - local save status
   - project list
   - `.ghgproj` backup/import
   - optional local snapshots
2. Keep privacy messaging clear.
3. Add update/license status in a compact desktop header or settings panel.

### Phase 5: Verification

1. Compare web and desktop for:
   - Scope 1 fixed combustion calculation
   - Scope 1 mobile combustion calculation
   - fugitive emissions calculation
   - Scope 2 location-based calculation
   - Scope 2 market-based calculation
   - facility/equity boundary adjustment
   - Excel import/export round trip
   - Word/PDF report generation
   - `.ghgproj` backup/import round trip
2. Run:
   - TypeScript typecheck
   - Vite build
   - Tauri dev smoke test
   - MSI build

## What Should Not Be Committed Yet

The current desktop source changes should not be committed as final product direction until the parity refactor begins, because the simplified UI may conflict with the target web-parity implementation.

Keep:
- SQLite/Tauri storage backend
- `.ghgproj` export/import backend
- license/update backend
- Chapter 9 report package
- Word/PDF/HTML report capability

Rework:
- `apps/desktop/src/main.tsx` UI shell
- simplified annual input table
- simplified result cards
- simplified factor management section

## Immediate Next Engineering Task

Create the desktop parity shell:

1. Introduce a web-style `DesktopCalculator` component.
2. Port `ResultsDisplay`, `Scope1Calculator`, `Scope2Calculator`, and `EmissionSourceCard`.
3. Wire these components to local SQLite project state instead of Supabase.
4. Keep Scope 3 as an inquiry panel.
5. Keep the current report/export backend available behind the web-style report action.
