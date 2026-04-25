# Report Engine Plan

## Goal

Build a desktop-first report engine that turns Scope 1/2 calculation results into a professional report package aligned with Chapter 9 of `ghg-protocol-revised_kor.pdf`.

The report engine must support:

- `docx` as the primary deliverable
- `pdf` as a derived export
- `html` as an internal preview and fallback render target

## Current status

The report package now has a structured Chapter 9 data model in `packages/report/src/index.ts`.

Implemented foundations:

- report totals model
- inventory boundary model
- methodology model
- base year / recalculation policy model
- verification model
- contact model
- facility summary model
- optional disclosure model
- Chapter 9 checklist builder
- helper to create a draft report object from calculation results

## Planned implementation order

### 1. Report data assembly in desktop app

Collect report inputs from the desktop project and map them into `Chapter9ReportData`.

Needs:

- company metadata
- reporting period
- organizational boundary summary
- operational boundary summary
- exclusions
- methodology notes
- verification status
- contact details

### 2. HTML report renderer

Create a deterministic HTML renderer in `@ghg/report`.

Purpose:

- fast preview in desktop app
- base layout for future PDF conversion
- easy inspection during development

### 3. DOCX generator

Primary user-facing export.

Requirements:

- modern professional cover and section layout
- Chapter 9 required information reflected explicitly
- summary tables for Scope 1 / Scope 2 location / Scope 2 market
- facility summary table
- appendix for source-level detail where needed

### 4. PDF export

Generate PDF from the approved HTML report template or from DOCX conversion, depending on quality and implementation cost.

Preferred decision rule:

- if HTML -> PDF gives stable Korean typography and page breaks, use it
- otherwise use DOCX-first workflow and export PDF separately

## Design principles

- modern and restrained visual style
- corporate document tone, not marketing layout
- strong section hierarchy
- clean tables with readable totals
- explicit distinction between required and optional disclosures
- Korean-first wording

## Compliance principles

The report generator should not treat Chapter 9 as a generic narrative template. It must map report content to explicit disclosure fields.

Important behavior:

- required items must be detectable by checklist
- missing items must be visible before export
- optional items should be rendered only when present
- Scope 3 must not appear as a calculated section in the standard desktop report

## Next step

Implement desktop-side report input collection and a first HTML preview renderer.
