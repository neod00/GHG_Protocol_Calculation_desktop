# GHG Desktop

Local-first desktop relaunch for the GHG Protocol calculator.

## Product Direction

- Desktop framework: Tauri
- Initial OS target: Windows
- Initial calculation scope: Scope 1 and Scope 2
- Scope 3: individual inquiry only
- Storage: SQLite as the local app database, `.ghgproj` for export/import and optional cloud-drive sync
- Reports: Word, PDF, and HTML generated from the same report data model
- Report standard: Chapter 9, `ghg-protocol-revised_kor.pdf`, greenhouse gas emissions reporting requirements
- License/update operations: separate Vercel-hosted license admin web app

## Workspace Layout

```text
apps/desktop              Tauri desktop app
apps/license-admin        Vercel-ready license/admin web app
packages/core             Scope 1/2 calculation types and deterministic logic
packages/report           Report schema and Chapter 9 checklist
packages/storage          SQLite and .ghgproj storage boundary
packages/protocol-guide   GHG Protocol Chapter 9 help/checklist content
docs                      planning and implementation notes
```

## Guardrail

This workspace is intentionally separate from the existing deployed web app. Do not modify or delete files in the existing `ghg-saas` app while developing this workspace unless explicitly requested.
