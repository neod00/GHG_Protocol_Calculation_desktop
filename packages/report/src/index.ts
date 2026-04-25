import type {
  CalculationResult,
  EmissionSource,
  EmissionSourceResult,
  OrganizationBoundary
} from "@ghg/core";
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  PageBreak,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  UnderlineType,
  WidthType
} from "docx";

export type ReportOutputFormat = "html" | "pdf" | "docx";
export type ReportSectionStatus = "complete" | "partial" | "missing";

export interface ReportChecklistItem {
  id: string;
  label: string;
  required: boolean;
  complete: boolean;
  status: ReportSectionStatus;
  guidance?: string;
}

export interface ReportTotals {
  scope1Tco2e: number;
  scope2LocationTco2e: number;
  scope2MarketTco2e: number;
  totalLocationTco2e: number;
  totalMarketTco2e: number;
}

export interface ReportInventoryBoundary {
  organizationalBoundarySummary: string;
  operationalBoundarySummary: string;
  includedScopes: Array<"scope1" | "scope2">;
  excludedActivities?: string[];
}

export interface ReportMethodology {
  calculationMethodSummary: string;
  emissionFactorSources: string[];
  dataQualityNotes?: string[];
  uncertaintyNotes?: string[];
}

export interface ReportBaseYearPolicy {
  baseYear?: string;
  baseYearSelectionReason?: string;
  recalculationPolicy: string;
  structuralChangePolicy?: string;
}

export interface ReportVerificationInfo {
  status: "not_performed" | "internal_review" | "external_verification";
  verifierName?: string;
  verificationStandard?: string;
  verificationOpinion?: string;
}

export interface ReportContactInfo {
  department?: string;
  name: string;
  email?: string;
  phone?: string;
}

export interface FacilityReportSummary {
  facilityId: string;
  facilityName: string;
  scope1Tco2e: number;
  scope2LocationTco2e: number;
  scope2MarketTco2e: number;
}

export type OptionalDisclosureCategory =
  | "intensity_metrics"
  | "reduction_initiatives"
  | "energy_contracts"
  | "other";

export interface OptionalDisclosureItem {
  category: OptionalDisclosureCategory;
  title: string;
  description: string;
}

export interface Chapter9ReportData {
  boundary: OrganizationBoundary;
  reportingPeriod: string;
  inventoryBoundary: ReportInventoryBoundary;
  totals: ReportTotals;
  sources: EmissionSourceResult[];
  methodology: ReportMethodology;
  baseYearPolicy: ReportBaseYearPolicy;
  verification: ReportVerificationInfo;
  contact: ReportContactInfo;
  facilitySummaries?: FacilityReportSummary[];
  optionalDisclosures?: OptionalDisclosureItem[];
}

function hasOptionalDisclosure(data: Chapter9ReportData, category: OptionalDisclosureCategory): boolean {
  return Boolean(data.optionalDisclosures?.some((item) => item.category === category));
}

function getChecklistStatus(complete: boolean, required: boolean): ReportSectionStatus {
  if (complete) return "complete";
  return required ? "missing" : "partial";
}

function hasText(value: string | undefined): boolean {
  return Boolean(value && value.trim().length > 0);
}

function hasItems<T>(value: T[] | undefined): boolean {
  return Boolean(value && value.length > 0);
}

export function buildChapter9Checklist(data: Chapter9ReportData): ReportChecklistItem[] {
  const checklist: Array<Omit<ReportChecklistItem, "status">> = [
    {
      id: "organizationalBoundary",
      label: "기업 및 조직 경계",
      required: true,
      complete:
        hasText(data.boundary.companyName) &&
        hasText(data.inventoryBoundary.organizationalBoundarySummary),
      guidance: "회사명과 조직 경계 설명을 보고서에 명확히 적어야 합니다."
    },
    {
      id: "approach",
      label: "조직 경계 접근법",
      required: true,
      complete: hasText(data.boundary.consolidationApproach),
      guidance: "운영 통제, 재무 통제, 지분율 중 적용한 접근법을 명시해야 합니다."
    },
    {
      id: "operationalBoundary",
      label: "운영 경계 및 포함 범위",
      required: true,
      complete:
        hasText(data.inventoryBoundary.operationalBoundarySummary) &&
        hasItems(data.inventoryBoundary.includedScopes),
      guidance: "포함한 Scope와 운영 경계 설명을 함께 제시해야 합니다."
    },
    {
      id: "period",
      label: "보고 기간",
      required: true,
      complete: hasText(data.reportingPeriod) && hasText(data.boundary.reportingYear),
      guidance: "보고연도와 실제 보고기간을 함께 제시해야 합니다."
    },
    {
      id: "scopeTotals",
      label: "Scope 1 및 Scope 2 배출량",
      required: true,
      complete:
        data.sources.length > 0 &&
        data.totals.totalLocationTco2e >= 0 &&
        data.totals.totalMarketTco2e >= 0,
      guidance: "Scope 1, Scope 2 location-based, Scope 2 market-based 총량을 모두 제시해야 합니다."
    },
    {
      id: "sourceInventory",
      label: "배출원 목록 및 배출량 상세",
      required: true,
      complete: hasItems(data.sources),
      guidance: "배출원명, 활동자료, 연료/에너지, 결과값을 추적 가능하게 남겨야 합니다."
    },
    {
      id: "methodology",
      label: "산정 방법론",
      required: true,
      complete:
        hasText(data.methodology.calculationMethodSummary) &&
        hasItems(data.methodology.emissionFactorSources),
      guidance: "활동자료, 산정 방식, 적용 원칙을 문서로 남겨야 합니다."
    },
    {
      id: "factors",
      label: "배출계수 및 출처",
      required: true,
      complete: hasItems(data.methodology.emissionFactorSources),
      guidance: "사용한 배출계수 문서와 데이터 출처를 구체적으로 적어야 합니다."
    },
    {
      id: "dataQuality",
      label: "데이터 품질 메모",
      required: true,
      complete: hasItems(data.methodology.dataQualityNotes),
      guidance: "자료 출처, 내부 검토 방식, 품질 관리 메모를 남겨야 합니다."
    },
    {
      id: "uncertainty",
      label: "불확실성 및 한계",
      required: true,
      complete: hasItems(data.methodology.uncertaintyNotes),
      guidance: "계량 한계, 추정 사용, 데이터 불일치 등 불확실성을 설명해야 합니다."
    },
    {
      id: "excluded",
      label: "제외된 배출원 및 활동",
      required: true,
      complete: Array.isArray(data.inventoryBoundary.excludedActivities),
      guidance: "제외 항목이 없더라도 '없음' 또는 판단 근거를 남겨야 합니다."
    },
    {
      id: "baseYearSelection",
      label: "기준연도 선정 사유",
      required: true,
      complete: hasText(data.baseYearPolicy.baseYearSelectionReason),
      guidance: "기준연도 선택 배경과 선택 논리를 남겨야 합니다."
    },
    {
      id: "recalculationPolicy",
      label: "재산정 정책",
      required: true,
      complete: hasText(data.baseYearPolicy.recalculationPolicy),
      guidance: "구조 변경이나 중대한 정정 시 재산정 기준을 제시해야 합니다."
    },
    {
      id: "verificationStatus",
      label: "검증 상태",
      required: true,
      complete: hasText(data.verification.status),
      guidance: "외부 검증이 없더라도 검증 여부와 상태는 표시해야 합니다."
    },
    {
      id: "verificationStandard",
      label: "검증 기준 및 검토자",
      required: false,
      complete:
        hasText(data.verification.verifierName) ||
        hasText(data.verification.verificationStandard) ||
        hasText(data.verification.verificationOpinion),
      guidance: "검토자, 검증 기준, 검증 의견은 선택 항목이지만 대외 문서 품질을 높여줍니다."
    },
    {
      id: "contact",
      label: "담당자 정보",
      required: true,
      complete: hasText(data.contact.name) && (hasText(data.contact.email) || hasText(data.contact.phone)),
      guidance: "담당자 이름과 최소 한 가지 연락수단을 제공하는 것이 좋습니다."
    },
    {
      id: "facilityBreakdown",
      label: "시설별 배출량 요약",
      required: false,
      complete: hasItems(data.facilitySummaries),
      guidance: "선택 항목이지만 실무 보고서 품질을 크게 높여줍니다."
    },
    {
      id: "optionalIntensityMetrics",
      label: "선택 공시 - 비율 지표",
      required: false,
      complete: hasOptionalDisclosure(data, "intensity_metrics"),
      guidance: "생산량, 매출, 면적 등과 연계한 비율 지표를 별도로 공시할 수 있습니다."
    },
    {
      id: "optionalReductionInitiatives",
      label: "선택 공시 - 감축 프로그램",
      required: false,
      complete: hasOptionalDisclosure(data, "reduction_initiatives"),
      guidance: "감축 활동, 절감 프로젝트, 내부 프로그램을 선택적으로 제시할 수 있습니다."
    },
    {
      id: "optionalEnergyContracts",
      label: "선택 공시 - 에너지 계약 및 제도",
      required: false,
      complete: hasOptionalDisclosure(data, "energy_contracts"),
      guidance: "PPA, REC, 녹색프리미엄 등 계약 구조를 선택 항목으로 설명할 수 있습니다."
    },
    {
      id: "optionalOtherDisclosures",
      label: "선택 공시 - 기타",
      required: false,
      complete: hasOptionalDisclosure(data, "other"),
      guidance: "기타 특이사항, 외부 프로그램 참여, 설명 메모를 추가 공시할 수 있습니다."
    }
  ];

  return checklist.map((item) => ({
    ...item,
    status: getChecklistStatus(item.complete, item.required)
  }));
}

export function summarizeFacilityResults(
  boundary: OrganizationBoundary,
  facilityBreakdown: Record<string, CalculationResult>
): FacilityReportSummary[] {
  return boundary.facilities.map((facility) => {
    const result = facilityBreakdown[facility.id] || {
      scope1: 0,
      scope2Location: 0,
      scope2Market: 0,
      scope3: 0
    };

    return {
      facilityId: facility.id,
      facilityName: facility.name,
      scope1Tco2e: result.scope1 / 1000,
      scope2LocationTco2e: result.scope2Location / 1000,
      scope2MarketTco2e: result.scope2Market / 1000
    };
  });
}

export function buildReportTotals(params: {
  scope1KgCO2e: number;
  scope2LocationKgCO2e: number;
  scope2MarketKgCO2e: number;
}): ReportTotals {
  const scope1Tco2e = params.scope1KgCO2e / 1000;
  const scope2LocationTco2e = params.scope2LocationKgCO2e / 1000;
  const scope2MarketTco2e = params.scope2MarketKgCO2e / 1000;

  return {
    scope1Tco2e,
    scope2LocationTco2e,
    scope2MarketTco2e,
    totalLocationTco2e: scope1Tco2e + scope2LocationTco2e,
    totalMarketTco2e: scope1Tco2e + scope2MarketTco2e
  };
}

export function createDraftChapter9Report(params: {
  boundary: OrganizationBoundary;
  reportingPeriod: string;
  sources: EmissionSourceResult[];
  rawSources?: EmissionSource[];
  totals: ReportTotals;
  facilitySummaries?: FacilityReportSummary[];
}): Chapter9ReportData {
  const excludedActivities =
    params.rawSources && params.rawSources.length > params.sources.length
      ? ["현재 데스크탑 버전에서 지원하지 않는 배출원은 본 보고서 범위에서 제외"]
      : [];

  return {
    boundary: params.boundary,
    reportingPeriod: params.reportingPeriod,
    inventoryBoundary: {
      organizationalBoundarySummary: `${params.boundary.companyName}의 ${params.boundary.consolidationApproach} 기준 조직 경계`,
      operationalBoundarySummary: "Scope 1 직접배출 및 Scope 2 간접배출을 포함",
      includedScopes: ["scope1", "scope2"],
      excludedActivities
    },
    totals: params.totals,
    sources: params.sources,
    methodology: {
      calculationMethodSummary: "활동자료 x 배출계수 방식으로 Scope 1 및 Scope 2를 산정",
      emissionFactorSources: ["국가 고시 배출계수", "GHG Protocol Scope 2 Guidance", "내부 관리 배출계수"],
      dataQualityNotes: [],
      uncertaintyNotes: []
    },
    baseYearPolicy: {
      baseYear: params.boundary.reportingYear,
      baseYearSelectionReason: "현재 보고연도를 기준연도로 설정한 초안",
      recalculationPolicy: "조직 경계 변경, 산정 방법 변경, 중대한 데이터 정정 발생 시 기준연도를 재산정",
      structuralChangePolicy: "인수합병, 사업 양수도, 시설 중대 변경이 발생하면 재산정 여부를 검토"
    },
    verification: {
      status: "not_performed"
    },
    contact: {
      name: ""
    },
    facilitySummaries: params.facilitySummaries || [],
    optionalDisclosures: []
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatTco2e(value: number): string {
  return `${value.toLocaleString("ko-KR", { maximumFractionDigits: 4 })} tCO2e`;
}

function renderList(items: string[]): string {
  if (items.length === 0) {
    return "<li>없음</li>";
  }

  return items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

export function renderChapter9ReportHtml(data: Chapter9ReportData): string {
  const checklist = buildChapter9Checklist(data);
  const requiredChecklist = checklist.filter((item) => item.required);
  const optionalChecklist = checklist.filter((item) => !item.required);
  const missingRequiredChecklist = requiredChecklist.filter((item) => item.status !== "complete");
  const facilityRows = (data.facilitySummaries || [])
    .map(
      (facility) => `
        <tr>
          <td>${escapeHtml(facility.facilityName)}</td>
          <td>${formatTco2e(facility.scope1Tco2e)}</td>
          <td>${formatTco2e(facility.scope2LocationTco2e)}</td>
          <td>${formatTco2e(facility.scope2MarketTco2e)}</td>
        </tr>
      `
    )
    .join("");
  const sourceRows = data.sources
    .map(
      (source) => `
        <tr>
          <td>${escapeHtml(source.description)}</td>
          <td>${escapeHtml(source.category)}</td>
          <td>${escapeHtml(source.fuelType)}</td>
          <td>${escapeHtml(source.unit)}</td>
          <td>${formatTco2e(source.emissionsTCO2e)}</td>
        </tr>
      `
    )
    .join("");

  const optionalDisclosureSections = (data.optionalDisclosures || [])
    .map(
      (item) => `
        <article class="note-card">
          <h4>${escapeHtml(item.title)}</h4>
          <p>${escapeHtml(item.description)}</p>
        </article>
      `
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>온실가스 배출량 보고서</title>
    <style>
      :root {
        color: #172033;
        background: #eef2f6;
        font-family: "Segoe UI", "Malgun Gothic", sans-serif;
      }
      * { box-sizing: border-box; }
      body { margin: 0; padding: 32px; }
      .report {
        max-width: 1120px;
        margin: 0 auto;
        background: #ffffff;
        border: 1px solid #d9e1ec;
        box-shadow: 0 24px 60px rgba(23, 32, 51, 0.12);
      }
      .cover {
        display: grid;
        gap: 20px;
        padding: 40px;
        background: linear-gradient(180deg, #fffaf3 0%, #ffffff 100%);
        border-bottom: 1px solid #e5ebf2;
      }
      .kicker {
        color: #d87d2a;
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      h1, h2, h3, h4, p { margin: 0; }
      h1 { font-size: 34px; }
      h2 { font-size: 22px; margin-bottom: 14px; }
      h3 { font-size: 16px; margin-bottom: 10px; }
      h4 { font-size: 15px; margin-bottom: 8px; }
      .meta-grid,
      .summary-grid,
      .section-grid,
      .checklist-grid,
      .note-grid {
        display: grid;
        gap: 14px;
      }
      .meta-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .summary-grid { grid-template-columns: repeat(5, minmax(0, 1fr)); }
      .checklist-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .section {
        padding: 28px 40px;
        border-bottom: 1px solid #edf2f7;
      }
      .meta-card,
      .metric-card,
      .info-card,
      .check-card,
      .note-card {
        border: 1px solid #d9e1ec;
        border-radius: 8px;
        padding: 16px;
        background: #ffffff;
      }
      .metric-card strong {
        display: block;
        margin-top: 6px;
        font-size: 20px;
      }
      .label {
        color: #6a778b;
        font-size: 12px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }
      .section-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      ul {
        margin: 10px 0 0;
        padding-left: 18px;
        color: #465366;
        line-height: 1.6;
      }
      p {
        color: #465366;
        line-height: 1.7;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 12px;
      }
      th, td {
        border: 1px solid #d9e1ec;
        padding: 12px;
        text-align: left;
        font-size: 14px;
      }
      th {
        background: #f7f9fc;
        color: #526176;
      }
      .status {
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        padding: 4px 8px;
        font-size: 12px;
        font-weight: 800;
      }
      .status.complete { background: #e7f8ee; color: #165b33; }
      .status.partial { background: #eef4fb; color: #355a84; }
      .status.missing { background: #fff1e6; color: #9a4d00; }
      .warning-box {
        border: 1px solid #f2d1a9;
        background: #fff1e6;
        color: #6d3900;
        border-radius: 8px;
        padding: 16px;
      }
      @media print {
        body { padding: 0; background: white; }
        .report { box-shadow: none; border: 0; }
      }
    </style>
  </head>
  <body>
    <article class="report">
      <section class="cover">
        <div class="kicker">GHG Protocol Chapter 9 Report Draft</div>
        <h1>${escapeHtml(data.boundary.companyName)} 온실가스 배출량 보고서</h1>
        <div class="meta-grid">
          <div class="meta-card">
            <div class="label">보고연도</div>
            <p>${escapeHtml(data.boundary.reportingYear)}</p>
          </div>
          <div class="meta-card">
            <div class="label">보고기간</div>
            <p>${escapeHtml(data.reportingPeriod)}</p>
          </div>
          <div class="meta-card">
            <div class="label">조직 경계 접근법</div>
            <p>${escapeHtml(data.boundary.consolidationApproach)}</p>
          </div>
        </div>
      </section>

      <section class="section">
        <h2>배출량 요약</h2>
        <div class="summary-grid">
          <div class="metric-card"><div class="label">Scope 1</div><strong>${formatTco2e(data.totals.scope1Tco2e)}</strong></div>
          <div class="metric-card"><div class="label">Scope 2 Location</div><strong>${formatTco2e(data.totals.scope2LocationTco2e)}</strong></div>
          <div class="metric-card"><div class="label">Scope 2 Market</div><strong>${formatTco2e(data.totals.scope2MarketTco2e)}</strong></div>
          <div class="metric-card"><div class="label">총배출량 Location</div><strong>${formatTco2e(data.totals.totalLocationTco2e)}</strong></div>
          <div class="metric-card"><div class="label">총배출량 Market</div><strong>${formatTco2e(data.totals.totalMarketTco2e)}</strong></div>
        </div>
      </section>

      <section class="section">
        <h2>필수 공시 항목 점검</h2>
        ${
          missingRequiredChecklist.length > 0
            ? `
              <div class="warning-box" style="margin-bottom:14px;">
                <strong>필수 항목 누락 경고</strong>
                <ul>${renderList(missingRequiredChecklist.map((item) => item.label))}</ul>
              </div>
            `
            : ""
        }
        <div class="checklist-grid">
          ${requiredChecklist
            .map(
              (item) => `
                <div class="check-card">
                  <div class="status ${item.status}">${item.status}</div>
                  <h3>${escapeHtml(item.label)}</h3>
                  <p>${escapeHtml(item.guidance || "")}</p>
                </div>
              `
            )
            .join("")}
        </div>
      </section>

      <section class="section">
        <h2>기업 및 인벤토리 경계</h2>
        <div class="section-grid">
          <div class="info-card">
            <div class="label">조직 경계</div>
            <p>${escapeHtml(data.inventoryBoundary.organizationalBoundarySummary)}</p>
          </div>
          <div class="info-card">
            <div class="label">운영 경계</div>
            <p>${escapeHtml(data.inventoryBoundary.operationalBoundarySummary)}</p>
          </div>
        </div>
        <div class="info-card" style="margin-top:14px;">
          <div class="label">제외된 배출원 및 활동</div>
          <ul>${renderList(data.inventoryBoundary.excludedActivities || [])}</ul>
        </div>
      </section>

      <section class="section">
        <h2>산정 방법론 및 배출계수</h2>
        <div class="section-grid">
          <div class="info-card">
            <div class="label">산정 방법론</div>
            <p>${escapeHtml(data.methodology.calculationMethodSummary)}</p>
          </div>
          <div class="info-card">
            <div class="label">배출계수 출처</div>
            <ul>${renderList(data.methodology.emissionFactorSources)}</ul>
          </div>
        </div>
        <div class="section-grid" style="margin-top:14px;">
          <div class="info-card">
            <div class="label">데이터 품질 메모</div>
            <ul>${renderList(data.methodology.dataQualityNotes || [])}</ul>
          </div>
          <div class="info-card">
            <div class="label">불확실성 및 한계</div>
            <ul>${renderList(data.methodology.uncertaintyNotes || [])}</ul>
          </div>
        </div>
      </section>

      <section class="section">
        <h2>기준연도 및 재산정 정책</h2>
        <div class="section-grid">
          <div class="info-card">
            <div class="label">기준연도 선정</div>
            <p>${escapeHtml(data.baseYearPolicy.baseYearSelectionReason || "")}</p>
          </div>
          <div class="info-card">
            <div class="label">재산정 정책</div>
            <p>${escapeHtml(data.baseYearPolicy.recalculationPolicy)}</p>
          </div>
        </div>
      </section>

      <section class="section">
        <h2>시설별 배출량</h2>
        <table>
          <thead>
            <tr>
              <th>시설</th>
              <th>Scope 1</th>
              <th>Scope 2 Location</th>
              <th>Scope 2 Market</th>
            </tr>
          </thead>
          <tbody>
            ${facilityRows || '<tr><td colspan="4">시설별 요약 데이터가 없습니다.</td></tr>'}
          </tbody>
        </table>
      </section>

      <section class="section">
        <h2>검증 및 담당자</h2>
        <div class="section-grid">
          <div class="info-card">
            <div class="label">검증 상태</div>
            <p>${escapeHtml(data.verification.status)}</p>
            <p>${escapeHtml(data.verification.verificationStandard || "")}</p>
            <p>${escapeHtml(data.verification.verificationOpinion || "")}</p>
          </div>
          <div class="info-card">
            <div class="label">담당자</div>
            <p>${escapeHtml(data.contact.department || "")} ${escapeHtml(data.contact.name)}</p>
            <p>${escapeHtml(data.contact.email || "")}</p>
            <p>${escapeHtml(data.contact.phone || "")}</p>
          </div>
        </div>
      </section>

      <section class="section">
        <h2>선택 공시 항목</h2>
        <div class="checklist-grid">
          ${optionalChecklist
            .map(
              (item) => `
                <div class="check-card">
                  <div class="status ${item.status}">${item.status}</div>
                  <h3>${escapeHtml(item.label)}</h3>
                  <p>${escapeHtml(item.guidance || "")}</p>
                </div>
              `
            )
            .join("")}
        </div>
        <div class="note-grid" style="margin-top:14px;">
          ${optionalDisclosureSections || '<div class="note-card"><p>입력된 선택 공시 항목이 없습니다.</p></div>'}
        </div>
      </section>

      <section class="section">
        <h2>부록 A. 배출원 상세</h2>
        <table>
          <thead>
            <tr>
              <th>배출원명</th>
              <th>카테고리</th>
              <th>연료/에너지</th>
              <th>단위</th>
              <th>배출량</th>
            </tr>
          </thead>
          <tbody>
            ${sourceRows || '<tr><td colspan="5">배출원 데이터가 없습니다.</td></tr>'}
          </tbody>
        </table>
      </section>
    </article>
  </body>
</html>`;
}

function paragraph(text: string, options?: { heading?: (typeof HeadingLevel)[keyof typeof HeadingLevel]; bold?: boolean }): Paragraph {
  return new Paragraph({
    heading: options?.heading,
    spacing: { after: 160 },
    children: [new TextRun({ text, bold: options?.bold })]
  });
}

function bodyParagraph(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 140, line: 320 },
    children: [new TextRun({ text, size: 21 })]
  });
}

function bulletParagraph(text: string): Paragraph {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 100, line: 300 },
    children: [new TextRun({ text, size: 21 })]
  });
}

function sectionHeading(title: string, subtitle?: string): Paragraph[] {
  return [
    new Paragraph({
      spacing: { before: 220, after: 80 },
      border: {
        top: { style: BorderStyle.SINGLE, size: 10, color: "D87D2A" }
      }
    }),
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { after: subtitle ? 40 : 180 },
      children: [new TextRun({ text: title, bold: true, size: 28, color: "172033" })]
    }),
    ...(subtitle
      ? [
          new Paragraph({
            spacing: { after: 180 },
            children: [new TextRun({ text: subtitle, italics: true, color: "526176", size: 20 })]
          })
        ]
      : [])
  ];
}

function keyValueTable(rows: Array<[string, string]>): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(
      ([label, value]) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: 28, type: WidthType.PERCENTAGE },
              shading: { fill: "F7F9FC" },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 1, color: "D9E1EC" },
                bottom: { style: BorderStyle.SINGLE, size: 1, color: "D9E1EC" },
                left: { style: BorderStyle.SINGLE, size: 1, color: "D9E1EC" },
                right: { style: BorderStyle.SINGLE, size: 1, color: "D9E1EC" }
              },
              children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 21 })] })]
            }),
            new TableCell({
              width: { size: 72, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 1, color: "D9E1EC" },
                bottom: { style: BorderStyle.SINGLE, size: 1, color: "D9E1EC" },
                left: { style: BorderStyle.SINGLE, size: 1, color: "D9E1EC" },
                right: { style: BorderStyle.SINGLE, size: 1, color: "D9E1EC" }
              },
              children: [new Paragraph({ children: [new TextRun({ text: value, size: 21 })] })]
            })
          ]
        })
    )
  });
}

function simpleTable(headers: string[], rows: string[][]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: headers.map(
          (header) =>
            new TableCell({
              shading: { fill: "F7F9FC" },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 1, color: "D9E1EC" },
                bottom: { style: BorderStyle.SINGLE, size: 1, color: "D9E1EC" },
                left: { style: BorderStyle.SINGLE, size: 1, color: "D9E1EC" },
                right: { style: BorderStyle.SINGLE, size: 1, color: "D9E1EC" }
              },
              children: [new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: header, bold: true, size: 21, color: "172033" })] })]
            })
        )
      }),
      ...rows.map(
        (row) =>
          new TableRow({
            children: row.map(
              (cell) =>
                new TableCell({
                  borders: {
                    top: { style: BorderStyle.SINGLE, size: 1, color: "D9E1EC" },
                    bottom: { style: BorderStyle.SINGLE, size: 1, color: "D9E1EC" },
                    left: { style: BorderStyle.SINGLE, size: 1, color: "D9E1EC" },
                    right: { style: BorderStyle.SINGLE, size: 1, color: "D9E1EC" }
                  },
                  children: [new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: cell, size: 21 })] })]
                })
            )
          })
      )
    ]
  });
}

export async function renderChapter9ReportDocx(data: Chapter9ReportData): Promise<Blob> {
  const checklist = buildChapter9Checklist(data);
  const requiredChecklist = checklist.filter((item) => item.required);
  const optionalChecklist = checklist.filter((item) => !item.required);
  const missingRequiredChecklist = requiredChecklist.filter((item) => item.status !== "complete");
  const facilityRows =
    data.facilitySummaries?.map((facility) => [
      facility.facilityName,
      formatTco2e(facility.scope1Tco2e),
      formatTco2e(facility.scope2LocationTco2e),
      formatTco2e(facility.scope2MarketTco2e)
    ]) || [];
  const sourceRows = data.sources.map((source) => [
    source.description,
    source.category,
    source.fuelType,
    source.unit,
    formatTco2e(source.emissionsTCO2e)
  ]);

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "Malgun Gothic",
            size: 21,
            color: "172033"
          },
          paragraph: {
            spacing: { after: 140, line: 320 }
          }
        }
      }
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1100,
              right: 900,
              bottom: 1100,
              left: 900
            }
          }
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 1200, after: 200 },
            children: [new TextRun({ text: "GHG PROTOCOL CHAPTER 9 REPORT", bold: true, color: "D87D2A", size: 18 })]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 },
            children: [new TextRun({ text: `${data.boundary.companyName} 온실가스 배출량 보고서`, bold: true, size: 38, color: "172033" })]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 320 },
            children: [new TextRun({ text: "기업 배출량 공시 초안", italics: true, color: "526176", size: 22 })]
          }),
          keyValueTable([
            ["보고연도", data.boundary.reportingYear],
            ["보고기간", data.reportingPeriod],
            ["조직 경계 접근법", data.boundary.consolidationApproach]
          ]),
          new Paragraph({
            spacing: { before: 260, after: 0 },
            children: [
              new TextRun({
                text: "본 문서는 GHG Protocol Chapter 9 보고 요건을 기준으로 구성한 Word 초안입니다.",
                color: "526176",
                size: 20
              })
            ]
          }),
          new Paragraph({ children: [new PageBreak()] }),

          ...sectionHeading("배출량 요약", "제출용 문서에서 가장 먼저 확인되는 핵심 총량 정보"),
          simpleTable(
            ["항목", "배출량"],
            [
              ["Scope 1", formatTco2e(data.totals.scope1Tco2e)],
              ["Scope 2 Location-based", formatTco2e(data.totals.scope2LocationTco2e)],
              ["Scope 2 Market-based", formatTco2e(data.totals.scope2MarketTco2e)],
              ["총배출량 Location-based", formatTco2e(data.totals.totalLocationTco2e)],
              ["총배출량 Market-based", formatTco2e(data.totals.totalMarketTco2e)]
            ]
          ),

          ...sectionHeading("필수 공시 항목 점검", "Chapter 9 필수 항목 누락 여부를 빠르게 검토하기 위한 섹션"),
          ...(missingRequiredChecklist.length > 0
            ? [
                new Paragraph({
                  spacing: { after: 100 },
                  shading: { fill: "FFF1E6" },
                  border: {
                    top: { style: BorderStyle.SINGLE, size: 6, color: "F2D1A9" },
                    bottom: { style: BorderStyle.SINGLE, size: 6, color: "F2D1A9" },
                    left: { style: BorderStyle.SINGLE, size: 6, color: "F2D1A9" },
                    right: { style: BorderStyle.SINGLE, size: 6, color: "F2D1A9" }
                  },
                  children: [new TextRun({ text: "필수 항목 누락 경고", bold: true, color: "9A4D00", size: 22 })]
                }),
                ...missingRequiredChecklist.map((item) => bulletParagraph(item.label))
              ]
            : []),
          ...requiredChecklist.flatMap((item) => [
            new Paragraph({
              spacing: { after: 60 },
              children: [
                new TextRun({ text: item.label, bold: true, underline: { type: UnderlineType.SINGLE }, size: 22 }),
                new TextRun({
                  text: `  [${item.status}]`,
                  bold: true,
                  color: item.status === "complete" ? "165B33" : "9A4D00",
                  size: 20
                })
              ]
            }),
            bulletParagraph(item.guidance || "")
          ]),

          ...sectionHeading("기업 및 인벤토리 경계"),
          bodyParagraph(`조직 경계: ${data.inventoryBoundary.organizationalBoundarySummary}`),
          bodyParagraph(`운영 경계: ${data.inventoryBoundary.operationalBoundarySummary}`),
          paragraph("제외된 배출원 및 활동", { bold: true }),
          ...(data.inventoryBoundary.excludedActivities?.length
            ? data.inventoryBoundary.excludedActivities.map((item) => bulletParagraph(item))
            : [bulletParagraph("없음")]),

          ...sectionHeading("산정 방법론 및 배출계수"),
          bodyParagraph(data.methodology.calculationMethodSummary),
          paragraph("배출계수 출처", { bold: true }),
          ...data.methodology.emissionFactorSources.map((item) => bulletParagraph(item)),
          paragraph("데이터 품질 메모", { bold: true }),
          ...((data.methodology.dataQualityNotes?.length || 0) > 0
            ? data.methodology.dataQualityNotes!.map((item) => bulletParagraph(item))
            : [bulletParagraph("별도 메모 없음")]),
          paragraph("불확실성 및 한계", { bold: true }),
          ...((data.methodology.uncertaintyNotes?.length || 0) > 0
            ? data.methodology.uncertaintyNotes!.map((item) => bulletParagraph(item))
            : [bulletParagraph("별도 메모 없음")]),

          ...sectionHeading("기준연도 및 재산정 정책"),
          keyValueTable([
            ["기준연도", data.baseYearPolicy.baseYear || data.boundary.reportingYear],
            ["기준연도 선정 사유", data.baseYearPolicy.baseYearSelectionReason || ""],
            ["재산정 정책", data.baseYearPolicy.recalculationPolicy],
            ["구조 변경 정책", data.baseYearPolicy.structuralChangePolicy || ""]
          ]),

          ...sectionHeading("시설별 배출량", "시설 단위 검토와 검증 대응을 위한 요약 표"),
          simpleTable(
            ["시설", "Scope 1", "Scope 2 Location", "Scope 2 Market"],
            facilityRows.length > 0 ? facilityRows : [["시설별 요약 데이터가 없습니다.", "", "", ""]]
          ),

          ...sectionHeading("검증 및 담당자"),
          keyValueTable([
            ["검증 상태", data.verification.status],
            ["검증기관/검토자", data.verification.verifierName || ""],
            ["검증 기준", data.verification.verificationStandard || ""],
            ["검증 의견", data.verification.verificationOpinion || ""],
            ["담당 부서", data.contact.department || ""],
            ["담당자", data.contact.name],
            ["이메일", data.contact.email || ""],
            ["연락처", data.contact.phone || ""]
          ]),

          ...sectionHeading("선택 공시 항목"),
          ...optionalChecklist.flatMap((item) => [
            new Paragraph({
              spacing: { after: 60 },
              children: [
                new TextRun({ text: item.label, bold: true, size: 22 }),
                new TextRun({ text: `  [${item.status}]`, bold: true, color: "355A84", size: 20 })
              ]
            }),
            bulletParagraph(item.guidance || "")
          ]),
          ...((data.optionalDisclosures?.length || 0) > 0
            ? data.optionalDisclosures!.flatMap((item) => [paragraph(item.title, { bold: true }), bodyParagraph(item.description)])
            : [bulletParagraph("입력된 선택 공시 항목이 없습니다.")]),

          ...sectionHeading("부록 A. 배출원 상세", "산정 근거 추적과 검증 대응을 위한 상세 목록"),
          simpleTable(
            ["배출원명", "카테고리", "연료/에너지", "단위", "배출량"],
            sourceRows.length > 0 ? sourceRows : [["배출원 데이터가 없습니다.", "", "", "", ""]]
          ),

          ...sectionHeading("작성 메모", "최종 제출 전 확인 권장 항목"),
          bulletParagraph("보고서 내 수치와 앱의 계산 결과가 일치하는지 최종 검토"),
          bulletParagraph("시장기준 Scope 2 power mix 입력이 실제 계약 구조와 일치하는지 검토"),
          bulletParagraph("외부 제출 시 검증 상태와 담당자 연락처 누락 여부 확인")
        ]
      }
    ]
  });

  return Packer.toBlob(doc);
}
