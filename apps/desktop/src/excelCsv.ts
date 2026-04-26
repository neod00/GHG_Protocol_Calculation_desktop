import { BoundaryApproach, EmissionCategory, EmissionSource, Facility, Scope12InventoryResults } from "@ghg/core";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const scope12Categories = [
  EmissionCategory.StationaryCombustion,
  EmissionCategory.MobileCombustion,
  EmissionCategory.ProcessEmissions,
  EmissionCategory.FugitiveEmissions,
  EmissionCategory.Waste,
  EmissionCategory.PurchasedEnergy
];

export interface CsvExportData {
  companyName: string;
  reportingYear: string;
  boundaryApproach: BoundaryApproach;
  facilities: Facility[];
  sources: EmissionSource[];
  results: Scope12InventoryResults;
}

export interface CsvImportResult {
  sources: EmissionSource[];
  errors: string[];
  warnings: string[];
}

function escapeCsv(value: string | number | undefined | null): string {
  const text = value === null || typeof value === "undefined" ? "" : String(value);
  if (!/[",\r\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells;
}

function parseNumber(value: string): number {
  const parsed = Number.parseFloat(value.replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function sourceToRow(source: EmissionSource, facilities: Facility[]): Array<string | number> {
  const facility = facilities.find((item) => item.id === source.facilityId);
  return [
    facility?.name || "",
    source.category,
    source.description,
    source.fuelType,
    source.unit,
    ...months.map((_, index) => source.monthlyQuantities[index] || 0)
  ];
}

function rowsToCsv(rows: Array<Array<string | number>>): string {
  return `\uFEFF${rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n")}`;
}

export function buildScope12TemplateCsv(facilities: Facility[]): string {
  const rows: Array<Array<string | number>> = [
    ["Facility Name", "Category", "Description", "Fuel/Material Type", "Unit", ...months],
    [
      facilities[0]?.name || "Headquarters",
      EmissionCategory.PurchasedEnergy,
      "Office electricity",
      "Grid Electricity",
      "kWh",
      1000,
      1200,
      1100,
      1300,
      1500,
      1800,
      2000,
      1900,
      1600,
      1400,
      1200,
      1100
    ],
    [
      facilities[0]?.name || "Headquarters",
      EmissionCategory.MobileCombustion,
      "Company vehicle gasoline",
      "Gasoline (Petrol)",
      "liters",
      100,
      100,
      110,
      120,
      120,
      130,
      140,
      140,
      130,
      120,
      110,
      100
    ]
  ];

  return rowsToCsv(rows);
}

export function buildScope12DataCsv(data: CsvExportData): string {
  const rows: Array<Array<string | number>> = [
    ["GHG Scope 1/2 Export"],
    ["Company", data.companyName],
    ["Reporting Year", data.reportingYear],
    ["Boundary Approach", data.boundaryApproach],
    ["Total Location kgCO2e", data.results.totalEmissionsLocation],
    ["Total Market kgCO2e", data.results.totalEmissionsMarket],
    [],
    ["Facility Name", "Category", "Description", "Fuel/Material Type", "Unit", ...months]
  ];

  data.sources
    .filter((source) => scope12Categories.includes(source.category))
    .forEach((source) => rows.push(sourceToRow(source, data.facilities)));

  return rowsToCsv(rows);
}

export function parseScope12Csv(csvText: string, facilities: Facility[]): CsvImportResult {
  const normalized = csvText.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n").filter((line) => line.trim().length > 0);
  const headerIndex = lines.findIndex((line) => {
    const cells = parseCsvLine(line).map((cell) => cell.trim().toLowerCase());
    return cells[0] === "facility name" && cells[1] === "category";
  });

  if (headerIndex === -1) {
    return { sources: [], errors: ["CSV 헤더를 찾지 못했습니다. 템플릿의 첫 열은 Facility Name, 두 번째 열은 Category여야 합니다."], warnings: [] };
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  const sources: EmissionSource[] = [];

  lines.slice(headerIndex + 1).forEach((line, rowOffset) => {
    const rowNumber = headerIndex + rowOffset + 2;
    const cells = parseCsvLine(line);
    const facilityName = cells[0]?.trim();
    const category = cells[1]?.trim() as EmissionCategory;
    const description = cells[2]?.trim() || `Imported source ${rowNumber}`;
    const fuelType = cells[3]?.trim();
    const unit = cells[4]?.trim();
    const monthlyQuantities = months.map((_, index) => parseNumber(cells[5 + index] || "0"));

    if (!facilityName && !category && !fuelType) return;

    const facility = facilities.find((item) => item.name === facilityName);
    if (!facility) {
      errors.push(`${rowNumber}행: 시설 "${facilityName}"을 찾을 수 없습니다.`);
      return;
    }

    if (!scope12Categories.includes(category)) {
      errors.push(`${rowNumber}행: Scope 1/2 범주가 아닙니다. 입력값: ${category}`);
      return;
    }

    if (!fuelType || !unit) {
      errors.push(`${rowNumber}행: Fuel/Material Type과 Unit은 필수입니다.`);
      return;
    }

    if (monthlyQuantities.every((value) => value === 0)) {
      warnings.push(`${rowNumber}행: 월별 사용량이 모두 0입니다.`);
    }

    sources.push({
      id: `import-${Date.now()}-${rowNumber}-${Math.random().toString(16).slice(2)}`,
      facilityId: facility.id,
      description,
      category,
      fuelType,
      monthlyQuantities,
      unit
    });
  });

  return { sources, errors, warnings };
}
