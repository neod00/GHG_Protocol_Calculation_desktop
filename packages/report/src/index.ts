import type { EmissionSourceResult, OrganizationBoundary } from "@ghg/core";

export type ReportOutputFormat = "html" | "pdf" | "docx";

export interface Chapter9ReportData {
  boundary: OrganizationBoundary;
  reportingPeriod: string;
  sources: EmissionSourceResult[];
  baseYearPolicy?: string;
  recalculationPolicy?: string;
  excludedSources?: string[];
  verificationStatus?: string;
  contactName?: string;
  contactEmail?: string;
  methodologySummary: string;
  emissionFactorSources: string[];
}

export interface ReportChecklistItem {
  id: string;
  label: string;
  required: boolean;
  complete: boolean;
}

export function buildChapter9Checklist(data: Chapter9ReportData): ReportChecklistItem[] {
  return [
    { id: "company", label: "기업 및 인벤토리 경계", required: true, complete: Boolean(data.boundary.companyName) },
    { id: "approach", label: "선택한 연결 접근법 및 조직경계", required: true, complete: Boolean(data.boundary.consolidationApproach) },
    { id: "period", label: "보고 기간", required: true, complete: Boolean(data.reportingPeriod) },
    { id: "scope12", label: "Scope 1 및 Scope 2 배출량 데이터", required: true, complete: data.sources.length > 0 },
    { id: "methodology", label: "산정 방법론", required: true, complete: Boolean(data.methodologySummary) },
    { id: "factors", label: "사용 배출계수 및 출처", required: true, complete: data.emissionFactorSources.length > 0 },
    { id: "excluded", label: "제외된 배출원, 시설, 사업활동", required: true, complete: Boolean(data.excludedSources) },
    { id: "baseYear", label: "기준연도 및 재계산 정책", required: true, complete: Boolean(data.baseYearPolicy && data.recalculationPolicy) },
    { id: "verification", label: "외부 검증 여부", required: true, complete: Boolean(data.verificationStatus) },
    { id: "contact", label: "담당자 연락처", required: true, complete: Boolean(data.contactName) }
  ];
}
