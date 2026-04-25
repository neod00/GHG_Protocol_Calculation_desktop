import React, { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { invoke } from "@tauri-apps/api/core";
import {
  BoundaryApproach,
  calculateScope12Inventory,
  calculateSourceEmissions,
  DEFAULT_SCOPE12_FACTORS,
  EmissionCategory,
  EmissionSource,
  EmissionSourceResult,
  Facility,
  formatKgCO2eAsTCO2e,
  getFactorsForCategory,
  getScopeForCategory,
  Scope12FactorSet
} from "@ghg/core";
import {
  buildChapter9Checklist,
  buildReportTotals,
  createDraftChapter9Report,
  renderChapter9ReportDocx,
  renderChapter9ReportHtml,
  summarizeFacilityResults
} from "@ghg/report";
import { LICENSE_VERIFY_URL, UPDATE_METADATA_URL } from "./config";
import { buildLicenseGate } from "./licenseGate";
import { LicenseVerificationResult, verifyLicense } from "./licenseClient";
import {
  createProjectEnvelope,
  DesktopProjectData,
  DesktopProjectBundleFile,
  DesktopProjectListItem,
  DesktopReportDraft,
  exportDesktopProjectBundle,
  importDesktopProjectBundle,
  listDesktopProjects,
  listDesktopProjectBundles,
  loadDesktopProject,
  loadLastDesktopProject,
  saveDesktopProject
} from "./projectStorage";
import "./styles.css";

const savedLicenseKeyStorageKey = "ghg-desktop-license-key";
const savedLicenseResultStorageKey = "ghg-desktop-license-result";

const navItems = [
  { label: "Scope 1/2 계산", gated: true },
  { label: "보고서 생성", gated: true },
  { label: "배출계수", gated: true },
  { label: "Scope 3 개별 문의", gated: false },
  { label: "설정", gated: false }
];

const calculationCategories = [
  EmissionCategory.StationaryCombustion,
  EmissionCategory.MobileCombustion,
  EmissionCategory.ProcessEmissions,
  EmissionCategory.FugitiveEmissions,
  EmissionCategory.Waste,
  EmissionCategory.PurchasedEnergy
];

const categoryLabels: Record<string, string> = {
  [EmissionCategory.StationaryCombustion]: "Scope 1 - 고정연소",
  [EmissionCategory.MobileCombustion]: "Scope 1 - 이동연소",
  [EmissionCategory.ProcessEmissions]: "Scope 1 - 공정배출",
  [EmissionCategory.FugitiveEmissions]: "Scope 1 - 누출배출",
  [EmissionCategory.Waste]: "Scope 1 - 폐기물",
  [EmissionCategory.PurchasedEnergy]: "Scope 2 - 구매전력"
};

const boundaryApproachLabels: Record<BoundaryApproach, string> = {
  operational: "운영 통제",
  financial: "재무 통제",
  equity: "지분율"
};

const verificationLabels = {
  not_performed: "미검증",
  internal_review: "내부 검토",
  external_verification: "외부 검증"
} as const;

const defaultFacilities: Facility[] = [
  { id: "facility-headquarters", name: "본사", equityShare: 100 },
  { id: "facility-plant", name: "공장", equityShare: 100 }
];

const reportGuideItems = [
  {
    title: "기업 및 인벤토리 경계",
    summary: "조직 경계, 운영 경계, 포함 범위와 제외 범위를 보고서에 명확히 적어야 합니다."
  },
  {
    title: "배출량 정보",
    summary: "Scope 1, Scope 2 location-based, market-based 결과와 산정 범위를 함께 제시해야 합니다."
  },
  {
    title: "기준연도 정책",
    summary: "기준연도 선정 사유와 구조 변경 시 재산정 원칙을 빠뜨리면 보고서 품질이 크게 떨어집니다."
  },
  {
    title: "검증 및 담당자",
    summary: "검증 여부, 담당자 정보, 필요 시 검증 의견을 남겨야 실무 보고서로 바로 사용할 수 있습니다."
  }
];

const scope2MixOptions = [
  { key: "ppa", label: "PPA 전력" },
  { key: "rec", label: "REC 전력" },
  { key: "greenPremium", label: "녹색프리미엄" },
  { key: "conventional", label: "일반전력" }
] as const;

type Scope2MixKey = (typeof scope2MixOptions)[number]["key"];

function toMonthlyArray(annualValue: number): number[] {
  const normalized = Number.isFinite(annualValue) ? annualValue : 0;
  return Array(12).fill(normalized / 12);
}

function getAnnualQuantity(source: EmissionSource): number {
  return source.monthlyQuantities.reduce((sum, value) => sum + value, 0);
}

function getAnnualMixQuantity(values?: number[]): number {
  return values?.reduce((sum, value) => sum + value, 0) || 0;
}

function createSource(category: EmissionCategory, factors: Scope12FactorSet, facilityId: string): EmissionSource {
  const factor = getFactorsForCategory(category, factors)[0];
  const unit = factor && "units" in factor ? factor.units[0] : "kg";
  const fuelType = factor?.name || "";

  return {
    id: `source-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    facilityId,
    description: categoryLabels[category],
    category,
    fuelType,
    monthlyQuantities: Array(12).fill(0),
    unit
  };
}

function createDefaultReportDraft(year: string, companyName: string): DesktopReportDraft {
  return {
    reportingPeriod: `${year}-01-01 ~ ${year}-12-31`,
    organizationalBoundarySummary: `${companyName}의 조직 경계를 설정하고 연결기준을 명시합니다.`,
    operationalBoundarySummary: "Scope 1 직접배출과 Scope 2 구매전력 간접배출을 포함합니다.",
    excludedActivitiesText: "현재 제외된 배출원 없음",
    methodologySummary: "활동자료 x 배출계수 방식으로 산정하며, Scope 2는 location-based와 market-based를 함께 제시합니다.",
    emissionFactorSourcesText: "국가 고시 배출계수\nGHG Protocol Scope 2 Guidance\n내부 관리 배출계수",
    recalculationPolicy: "조직 경계 변경, 산정 방법 변경, 중대한 데이터 정정이 발생하면 기준연도 재산정 여부를 검토합니다.",
    baseYearSelectionReason: "현재 보고연도를 기준연도로 설정한 초안입니다.",
    verificationStatus: "not_performed",
    verifierName: "",
    verificationOpinion: "",
    contactDepartment: "환경안전팀",
    contactName: "",
    contactEmail: "",
    contactPhone: ""
  };
}

function createDefaultProjectData(): DesktopProjectData {
  const reportingYear = new Date().getFullYear().toString();
  const companyName = "샘플 회사";

  return {
    companyName,
    reportingYear,
    boundaryApproach: "operational",
    facilities: defaultFacilities,
    sources: [
      {
        id: "source-demo-electricity",
        facilityId: "facility-headquarters",
        description: "사무실 전력",
        category: EmissionCategory.PurchasedEnergy,
        fuelType: "Grid Electricity",
        monthlyQuantities: [15000, 14500, 15200, 16000, 18000, 22000, 28000, 27000, 21000, 17000, 15500, 15000],
        unit: "kWh"
      },
      {
        id: "source-demo-mobile",
        facilityId: "facility-headquarters",
        description: "업무용 차량",
        category: EmissionCategory.MobileCombustion,
        fuelType: "Gasoline (Petrol)",
        monthlyQuantities: [120, 130, 125, 140, 150, 160, 180, 175, 155, 145, 135, 125],
        unit: "liters"
      }
    ],
    reportDraft: createDefaultReportDraft(reportingYear, companyName)
  };
}

function createProjectId(): string {
  return `project-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getStatusText(result: LicenseVerificationResult | null): string {
  if (!result) return "미인증";
  if (result.ok) return "활성";
  if (result.reason === "network_error") return "서버 연결 실패";
  if (result.reason === "license_not_found") return "라이선스 없음";
  if (result.reason === "expired") return "만료";
  if (result.reason === "blocked") return "차단";
  if (result.reason === "device_limit_exceeded") return "기기 수 초과";
  return "확인 필요";
}

function formatTimestamp(value: string | null): string {
  if (!value) return "아직 저장되지 않음";
  return new Date(value).toLocaleString("ko-KR");
}

function parseMultilineText(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function App() {
  const [licenseKey, setLicenseKey] = useState("");
  const [licenseResult, setLicenseResult] = useState<LicenseVerificationResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const [projectId, setProjectId] = useState(createProjectId());
  const [projectName, setProjectName] = useState("기본 프로젝트");
  const [companyName, setCompanyName] = useState("샘플 회사");
  const [reportingYear, setReportingYear] = useState(new Date().getFullYear().toString());
  const [facilities, setFacilities] = useState<Facility[]>(defaultFacilities);
  const [boundaryApproach, setBoundaryApproach] = useState<BoundaryApproach>("operational");
  const [sources, setSources] = useState<EmissionSource[]>(createDefaultProjectData().sources);
  const [reportDraft, setReportDraft] = useState<DesktopReportDraft>(
    createDefaultReportDraft(new Date().getFullYear().toString(), "샘플 회사")
  );
  const [projectList, setProjectList] = useState<DesktopProjectListItem[]>([]);
  const [projectBundles, setProjectBundles] = useState<DesktopProjectBundleFile[]>([]);
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [selectedBundleFile, setSelectedBundleFile] = useState("");
  const [bundleMessage, setBundleMessage] = useState<string | null>(null);
  const [bundleError, setBundleError] = useState<string | null>(null);
  const [isExportingBundle, setIsExportingBundle] = useState(false);
  const [isImportingBundle, setIsImportingBundle] = useState(false);
  const [isExportingReport, setIsExportingReport] = useState(false);
  const [exportedReportPath, setExportedReportPath] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const hydratedRef = useRef(false);

  useEffect(() => {
    const savedKey = localStorage.getItem(savedLicenseKeyStorageKey);
    const savedResult = localStorage.getItem(savedLicenseResultStorageKey);

    if (savedKey) setLicenseKey(savedKey);
    if (savedResult) {
      try {
        setLicenseResult(JSON.parse(savedResult) as LicenseVerificationResult);
      } catch {
        localStorage.removeItem(savedLicenseResultStorageKey);
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function hydrateProject() {
      try {
        const [lastProject, projects, bundles] = await Promise.all([
          loadLastDesktopProject(),
          listDesktopProjects(),
          listDesktopProjectBundles()
        ]);

        if (cancelled) return;

        if (lastProject) {
          setProjectId(lastProject.projectId);
          setProjectName(lastProject.projectName);
          setCompanyName(lastProject.data.companyName);
          setReportingYear(lastProject.data.reportingYear);
          setFacilities(lastProject.data.facilities);
          setBoundaryApproach(lastProject.data.boundaryApproach);
          setSources(lastProject.data.sources);
          setReportDraft(
            lastProject.data.reportDraft ||
              createDefaultReportDraft(lastProject.data.reportingYear, lastProject.data.companyName)
          );
          setLastSavedAt(lastProject.updatedAt);
        }

        setProjectList(projects);
        setProjectBundles(bundles);
        if (bundles[0]) {
          setSelectedBundleFile(bundles[0].fileName);
        }
        hydratedRef.current = true;
      } catch (error) {
        if (cancelled) return;
        setSaveState("error");
        setSaveError(error instanceof Error ? error.message : "프로젝트를 불러오지 못했습니다.");
      } finally {
        if (!cancelled) setIsLoadingProject(false);
      }
    }

    void hydrateProject();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setReportDraft((current) => ({
      ...current,
      reportingPeriod:
        current.reportingPeriod.trim().length === 0
          ? `${reportingYear}-01-01 ~ ${reportingYear}-12-31`
          : current.reportingPeriod
    }));
  }, [reportingYear]);

  async function refreshProjectList() {
    setProjectList(await listDesktopProjects());
  }

  async function refreshProjectBundles() {
    const bundles = await listDesktopProjectBundles();
    setProjectBundles(bundles);
    setSelectedBundleFile((current) => {
      if (current && bundles.some((item) => item.fileName === current)) {
        return current;
      }
      return bundles[0]?.fileName || "";
    });
  }

  async function persistProject() {
    const payload = createProjectEnvelope({
      projectId,
      projectName,
      data: {
        companyName,
        reportingYear,
        boundaryApproach,
        facilities,
        sources,
        reportDraft
      }
    });

    setSaveState("saving");
    setSaveError(null);

    try {
      await saveDesktopProject(payload);
      setSaveState("saved");
      setLastSavedAt(payload.updatedAt);
      await refreshProjectList();
      await refreshProjectBundles();
    } catch (error) {
      setSaveState("error");
      setSaveError(error instanceof Error ? error.message : "프로젝트 저장에 실패했습니다.");
    }
  }

  useEffect(() => {
    if (!hydratedRef.current) return;
    const timeout = window.setTimeout(() => void persistProject(), 500);
    return () => window.clearTimeout(timeout);
  }, [projectId, projectName, companyName, reportingYear, boundaryApproach, facilities, sources, reportDraft]);

  async function loadProjectFromList(nextProjectId: string) {
    setIsLoadingProject(true);
    try {
      const project = await loadDesktopProject(nextProjectId);
      if (!project) return;

      setProjectId(project.projectId);
      setProjectName(project.projectName);
      setCompanyName(project.data.companyName);
      setReportingYear(project.data.reportingYear);
      setFacilities(project.data.facilities);
      setBoundaryApproach(project.data.boundaryApproach);
      setSources(project.data.sources);
      setReportDraft(project.data.reportDraft || createDefaultReportDraft(project.data.reportingYear, project.data.companyName));
      setLastSavedAt(project.updatedAt);
      setSaveState("saved");
      setSaveError(null);
    } catch (error) {
      setSaveState("error");
      setSaveError(error instanceof Error ? error.message : "프로젝트를 불러오지 못했습니다.");
    } finally {
      setIsLoadingProject(false);
    }
  }

  async function handleLicenseSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedKey = licenseKey.trim();
    if (!trimmedKey) return;

    setIsChecking(true);
    const result = await verifyLicense(trimmedKey);
    setIsChecking(false);
    setLicenseResult(result);

    localStorage.setItem(savedLicenseKeyStorageKey, trimmedKey);
    localStorage.setItem(savedLicenseResultStorageKey, JSON.stringify(result));
  }

  function resetProject() {
    const data = createDefaultProjectData();
    setProjectId(createProjectId());
    setProjectName("새 프로젝트");
    setCompanyName(data.companyName);
    setReportingYear(data.reportingYear);
    setFacilities(data.facilities);
    setBoundaryApproach(data.boundaryApproach);
    setSources(data.sources);
    setReportDraft(data.reportDraft || createDefaultReportDraft(data.reportingYear, data.companyName));
    setLastSavedAt(null);
    setSaveState("idle");
    setSaveError(null);
  }

  function addSource(category: EmissionCategory) {
    setSources((current) => [...current, createSource(category, DEFAULT_SCOPE12_FACTORS, facilities[0].id)]);
  }

  function updateSource(sourceId: string, patch: Partial<EmissionSource>) {
    setSources((current) => current.map((source) => (source.id === sourceId ? { ...source, ...patch } : source)));
  }

  function updateSourceCategory(source: EmissionSource, category: EmissionCategory) {
    const next = createSource(category, DEFAULT_SCOPE12_FACTORS, source.facilityId);
    updateSource(source.id, {
      category,
      fuelType: next.fuelType,
      unit: next.unit,
      description: categoryLabels[category],
      powerMix: category === EmissionCategory.PurchasedEnergy ? source.powerMix : undefined
    });
  }

  function updateSourceFactor(source: EmissionSource, fuelType: string) {
    const factor = getFactorsForCategory(source.category, DEFAULT_SCOPE12_FACTORS).find((item) => item.name === fuelType);
    updateSource(source.id, {
      fuelType,
      unit: factor && "units" in factor ? factor.units[0] : source.unit
    });
  }

  function updateAnnualQuantity(sourceId: string, annualQuantity: number) {
    setSources((current) =>
      current.map((source) =>
        source.id === sourceId ? { ...source, monthlyQuantities: toMonthlyArray(annualQuantity) } : source
      )
    );
  }

  function updatePowerMix(
    sourceId: string,
    mixKey: Scope2MixKey,
    updater: (current: Record<string, unknown> | undefined) => Record<string, unknown> | undefined
  ) {
    setSources((current) =>
      current.map((source) => {
        if (source.id !== sourceId) return source;
        const currentMix = source.powerMix || {};
        const nextEntry = updater(currentMix[mixKey] as Record<string, unknown> | undefined);
        const nextMix = { ...currentMix };

        if (typeof nextEntry === "undefined") {
          delete nextMix[mixKey];
        } else {
          nextMix[mixKey] = nextEntry as never;
        }

        return { ...source, powerMix: Object.keys(nextMix).length > 0 ? nextMix : undefined };
      })
    );
  }

  function togglePowerMixSection(sourceId: string, mixKey: Scope2MixKey, enabled: boolean) {
    updatePowerMix(sourceId, mixKey, (current) => {
      if (!enabled) return undefined;
      if (current) return current;

      if (mixKey === "ppa") {
        return { quantity: toMonthlyArray(0), factor: 0, supplierName: "", contractId: "" };
      }
      if (mixKey === "rec") {
        return { quantity: toMonthlyArray(0), factor: 0, certificateId: "", issuer: "", meetsRequirements: true };
      }
      if (mixKey === "greenPremium") {
        return {
          quantity: toMonthlyArray(0),
          factor: 0,
          supplierName: "",
          contractId: "",
          treatAsRenewable: false,
          supplierFactorProvided: false,
          supplierFactor: 0
        };
      }
      return { quantity: toMonthlyArray(0), factor: 0, source: "national-average", supplierName: "" };
    });
  }

  function updatePowerMixAnnualQuantity(sourceId: string, mixKey: Scope2MixKey, annualQuantity: number) {
    updatePowerMix(sourceId, mixKey, (current) => ({
      ...current,
      quantity: toMonthlyArray(annualQuantity)
    }));
  }

  function removeSource(sourceId: string) {
    setSources((current) => current.filter((source) => source.id !== sourceId));
  }

  function updateReportDraft<K extends keyof DesktopReportDraft>(key: K, value: DesktopReportDraft[K]) {
    setReportDraft((current) => ({ ...current, [key]: value }));
  }

  async function handleExportBundle() {
    try {
      setIsExportingBundle(true);
      setBundleError(null);
      setBundleMessage(null);

      const payload = createProjectEnvelope({
        projectId,
        projectName,
        data: {
          companyName,
          reportingYear,
          boundaryApproach,
          facilities,
          sources,
          reportDraft
        }
      });

      const outputPath = await exportDesktopProjectBundle(payload);
      setBundleMessage(`백업 완료: ${outputPath}`);
      await refreshProjectBundles();
    } catch (error) {
      setBundleError(error instanceof Error ? error.message : ".ghgproj 백업에 실패했습니다.");
    } finally {
      setIsExportingBundle(false);
    }
  }

  async function handleImportBundle() {
    if (!selectedBundleFile) return;

    try {
      setIsImportingBundle(true);
      setBundleError(null);
      setBundleMessage(null);

      const project = await importDesktopProjectBundle(selectedBundleFile);
      setProjectId(project.projectId);
      setProjectName(project.projectName);
      setCompanyName(project.data.companyName);
      setReportingYear(project.data.reportingYear);
      setFacilities(project.data.facilities);
      setBoundaryApproach(project.data.boundaryApproach);
      setSources(project.data.sources);
      setReportDraft(project.data.reportDraft || createDefaultReportDraft(project.data.reportingYear, project.data.companyName));
      setLastSavedAt(project.updatedAt);
      setSaveState("saved");
      setBundleMessage(`불러오기 완료: ${selectedBundleFile}`);
      await refreshProjectList();
      await refreshProjectBundles();
    } catch (error) {
      setBundleError(error instanceof Error ? error.message : ".ghgproj 불러오기에 실패했습니다.");
    } finally {
      setIsImportingBundle(false);
    }
  }

  async function handleExportDocx() {
    try {
      setIsExportingReport(true);
      setExportError(null);
      const blob = await renderChapter9ReportDocx(reportChecklist.reportData);
      const bytes = Array.from(new Uint8Array(await blob.arrayBuffer()));
      const safeCompanyName = companyName.trim().replace(/[\\/:*?"<>|]/g, "_") || "GHG_Report";
      const outputPath = await invoke<string>("save_generated_report", {
        fileName: `${safeCompanyName}_${reportingYear}_ghg_report.docx`,
        bytes
      });

      setExportedReportPath(outputPath);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "Word 보고서 저장에 실패했습니다.");
    } finally {
      setIsExportingReport(false);
    }
  }

  const licenseGate = useMemo(() => buildLicenseGate(licenseResult), [licenseResult]);
  const statusText = getStatusText(licenseResult);
  const results = useMemo(
    () => calculateScope12Inventory({ sources, facilities, boundaryApproach }),
    [sources, facilities, boundaryApproach]
  );

  const reportSourceResults = useMemo<EmissionSourceResult[]>(() => {
    return sources.map((source) => {
      const calculation = calculateSourceEmissions(source, DEFAULT_SCOPE12_FACTORS);
      const scope = getScopeForCategory(source.category);
      const emissionsTCO2e =
        scope === "scope1" ? calculation.scope1 / 1000 : Math.max(calculation.scope2Location, calculation.scope2Market) / 1000;

      return {
        ...source,
        emissionsTCO2e,
        formula: calculation.formula || ""
      };
    });
  }, [sources]);

  const reportChecklist = useMemo(() => {
    const boundary = {
      companyName,
      reportingYear,
      consolidationApproach: boundaryApproach,
      facilities
    };

    const reportData = createDraftChapter9Report({
      boundary,
      reportingPeriod: reportDraft.reportingPeriod,
      sources: reportSourceResults,
      rawSources: sources,
      totals: buildReportTotals({
        scope1KgCO2e: results.scope1Total,
        scope2LocationKgCO2e: results.scope2LocationTotal,
        scope2MarketKgCO2e: results.scope2MarketTotal
      }),
      facilitySummaries: summarizeFacilityResults(boundary, results.facilityBreakdown)
    });

    reportData.inventoryBoundary.organizationalBoundarySummary = reportDraft.organizationalBoundarySummary;
    reportData.inventoryBoundary.operationalBoundarySummary = reportDraft.operationalBoundarySummary;
    reportData.inventoryBoundary.excludedActivities = parseMultilineText(reportDraft.excludedActivitiesText);
    reportData.methodology.calculationMethodSummary = reportDraft.methodologySummary;
    reportData.methodology.emissionFactorSources = parseMultilineText(reportDraft.emissionFactorSourcesText);
    reportData.baseYearPolicy.baseYearSelectionReason = reportDraft.baseYearSelectionReason;
    reportData.baseYearPolicy.recalculationPolicy = reportDraft.recalculationPolicy;
    reportData.verification.status = reportDraft.verificationStatus;
    reportData.verification.verifierName = reportDraft.verifierName || undefined;
    reportData.verification.verificationOpinion = reportDraft.verificationOpinion || undefined;
    reportData.contact.department = reportDraft.contactDepartment || undefined;
    reportData.contact.name = reportDraft.contactName;
    reportData.contact.email = reportDraft.contactEmail || undefined;
    reportData.contact.phone = reportDraft.contactPhone || undefined;

    return {
      reportData,
      checklist: buildChapter9Checklist(reportData),
      html: renderChapter9ReportHtml(reportData)
    };
  }, [boundaryApproach, companyName, facilities, reportDraft, reportingYear, reportSourceResults, results, sources]);

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark">GHG</div>
        <nav>
          {navItems.map((item, index) => {
            const disabled = item.gated && !licenseGate.canUseCoreFeatures;
            return (
              <a key={item.label} className={`${index === 0 ? "active" : ""} ${disabled ? "locked" : ""}`}>
                <span>{item.label}</span>
                {disabled && <small>잠금</small>}
              </a>
            );
          })}
        </nav>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Local-first desktop app</p>
            <h1>GHG Protocol Scope 1/2 계산</h1>
          </div>
          <button type="button" disabled={!licenseGate.canCreateProject} onClick={resetProject}>
            새 프로젝트
          </button>
        </header>

        <section className="project-panel">
          <div className="results-header">
            <div>
              <p className="eyebrow">Project</p>
              <h2>로컬 프로젝트 저장</h2>
              <p className="project-meta">
                상태:{" "}
                {isLoadingProject
                  ? "불러오는 중"
                  : saveState === "saving"
                    ? "저장 중"
                    : saveState === "saved"
                      ? "저장됨"
                      : saveState === "error"
                        ? "오류"
                        : "대기"}
                {" · "}최근 저장 {formatTimestamp(lastSavedAt)}
              </p>
              {saveError && <p className="error-copy">{saveError}</p>}
            </div>
            <div className="project-actions">
              <label>
                최근 프로젝트
                <select disabled={projectList.length === 0 || isLoadingProject} value={projectId} onChange={(event) => void loadProjectFromList(event.target.value)}>
                  <option value={projectId}>{projectName}</option>
                  {projectList
                    .filter((item) => item.projectId !== projectId)
                    .map((item) => (
                      <option key={item.projectId} value={item.projectId}>
                        {item.projectName}
                      </option>
                    ))}
                </select>
              </label>
              <button type="button" className="ghost-button" onClick={() => void persistProject()} disabled={isLoadingProject}>
                지금 저장
              </button>
            </div>
          </div>
          <div className="project-grid">
            <label>
              프로젝트명
              <input value={projectName} onChange={(event) => setProjectName(event.target.value)} />
            </label>
            <label>
              회사명
              <input value={companyName} onChange={(event) => setCompanyName(event.target.value)} />
            </label>
            <label>
              보고연도
              <input value={reportingYear} onChange={(event) => setReportingYear(event.target.value)} />
            </label>
            <label>
              조직 경계
              <select value={boundaryApproach} onChange={(event) => setBoundaryApproach(event.target.value as BoundaryApproach)}>
                <option value="operational">운영 통제</option>
                <option value="financial">재무 통제</option>
                <option value="equity">지분율</option>
              </select>
            </label>
          </div>
          <div className="bundle-panel">
            <div>
              <p className="eyebrow">Project backup</p>
              <h3>.ghgproj 백업 및 복원</h3>
              <p className="project-meta">백업 파일은 기본적으로 `Downloads` 폴더에 저장됩니다.</p>
            </div>
            <div className="bundle-actions">
              <button type="button" onClick={() => void handleExportBundle()} disabled={isExportingBundle || isLoadingProject}>
                {isExportingBundle ? ".ghgproj 저장 중" : ".ghgproj 백업"}
              </button>
              <label>
                백업 파일 선택
                <select value={selectedBundleFile} onChange={(event) => setSelectedBundleFile(event.target.value)} disabled={projectBundles.length === 0 || isImportingBundle}>
                  {projectBundles.length === 0 ? (
                    <option value="">백업 파일 없음</option>
                  ) : (
                    projectBundles.map((bundle) => (
                      <option key={bundle.fileName} value={bundle.fileName}>
                        {bundle.fileName}
                      </option>
                    ))
                  )}
                </select>
              </label>
              <button type="button" className="ghost-button" onClick={() => void handleImportBundle()} disabled={!selectedBundleFile || isImportingBundle}>
                {isImportingBundle ? "불러오는 중" : ".ghgproj 불러오기"}
              </button>
            </div>
            {bundleMessage && <p className="project-meta">{bundleMessage}</p>}
            {bundleError && <p className="error-copy">{bundleError}</p>}
          </div>
        </section>

        <section className="license-panel">
          <div>
            <p className="eyebrow">License</p>
            <h2>라이선스 확인</h2>
            <p>발급받은 라이선스 키를 입력하면 사용 가능 상태를 서버에서 확인합니다.</p>
          </div>

          <form className="license-form" onSubmit={handleLicenseSubmit}>
            <label htmlFor="licenseKey">라이선스 키</label>
            <div className="license-input-row">
              <input
                id="licenseKey"
                value={licenseKey}
                onChange={(event) => setLicenseKey(event.target.value)}
                placeholder="예: GHG-DEMO-0001"
                autoComplete="off"
              />
              <button type="submit" disabled={isChecking || licenseKey.trim().length === 0}>
                {isChecking ? "확인 중" : "확인"}
              </button>
            </div>
            <div className={`license-status ${licenseResult?.ok ? "active" : "inactive"}`}>
              <strong>{statusText}</strong>
              {licenseResult?.customer && <span>{licenseResult.customer}</span>}
              {licenseResult?.expiresAt && <span>만료일 {licenseResult.expiresAt}</span>}
              <span>{licenseGate.reasonText}</span>
            </div>
          </form>
        </section>

        <section className="privacy-panel">
          <div>
            <p className="eyebrow">Data policy</p>
            <h2>배출 데이터는 로컬에만 저장</h2>
            <p>연료 사용량, 전력 사용량, 시설 정보, 배출원 정보, 계산 결과는 로컬 SQLite에 저장됩니다.</p>
          </div>
          <div className="privacy-grid">
            <article>
              <h3>로컬 SQLite 저장</h3>
              <p>프로젝트명, 회사명, 보고연도, 시설, 배출원, 상세 전력 mix, 보고서 초안을 앱 내부 DB에 저장합니다.</p>
            </article>
            <article>
              <h3>외부 전송 항목</h3>
              <p>라이선스 확인용 `licenseKey`, `appVersion`, `deviceIdHash`와 업데이트 확인 요청만 전송합니다.</p>
            </article>
            <article>
              <h3>라이선스 확인 API</h3>
              <p>{LICENSE_VERIFY_URL}</p>
            </article>
            <article>
              <h3>업데이트 확인 API</h3>
              <p>{UPDATE_METADATA_URL}</p>
            </article>
          </div>
        </section>

        <section className={`feature-lock-panel ${licenseGate.canUseCoreFeatures ? "unlocked" : "locked"}`}>
          <div>
            <p className="eyebrow">Access control</p>
            <h2>{licenseGate.canUseCoreFeatures ? "핵심 기능 사용 가능" : "핵심 기능 잠금"}</h2>
            <p>{licenseGate.reasonText}</p>
          </div>
          <div className="feature-grid">
            <span className={licenseGate.canCreateProject ? "enabled" : "disabled"}>프로젝트 생성</span>
            <span className={licenseGate.canGenerateReport ? "enabled" : "disabled"}>보고서 생성</span>
            <span className={licenseGate.canEditEmissionFactors ? "enabled" : "disabled"}>배출계수 편집</span>
            <span className="enabled">로컬 저장</span>
          </div>
        </section>

        <section className="results-panel">
          <div className="results-header">
            <div>
              <p className="eyebrow">Calculation result</p>
              <h2>배출량 총괄</h2>
            </div>
          </div>
          <div className="metric-grid">
            <article>
              <span>Scope 1</span>
              <strong>{formatKgCO2eAsTCO2e(results.scope1Total)}</strong>
            </article>
            <article>
              <span>Scope 2 Location</span>
              <strong>{formatKgCO2eAsTCO2e(results.scope2LocationTotal)}</strong>
            </article>
            <article>
              <span>Scope 2 Market</span>
              <strong>{formatKgCO2eAsTCO2e(results.scope2MarketTotal)}</strong>
            </article>
            <article>
              <span>총배출량 Market 기준</span>
              <strong>{formatKgCO2eAsTCO2e(results.totalEmissionsMarket)}</strong>
            </article>
          </div>
        </section>

        <section className={`calculator-panel ${licenseGate.canUseCoreFeatures ? "" : "locked-panel"}`}>
          <div className="results-header">
            <div>
              <p className="eyebrow">Emission sources</p>
              <h2>Scope 1/2 배출원 입력</h2>
            </div>
            <div className="button-row">
              <button type="button" disabled={!licenseGate.canUseCoreFeatures} onClick={() => addSource(EmissionCategory.StationaryCombustion)}>
                고정연소 추가
              </button>
              <button type="button" disabled={!licenseGate.canUseCoreFeatures} onClick={() => addSource(EmissionCategory.PurchasedEnergy)}>
                구매전력 추가
              </button>
            </div>
          </div>

          {!licenseGate.canUseCoreFeatures && <p className="lock-copy">라이선스 인증 후 배출원 입력과 계산 기능을 사용할 수 있습니다.</p>}

          <div className="source-table">
            <div className="source-row source-head">
              <span>구분</span>
              <span>시설</span>
              <span>배출원명</span>
              <span>연료/에너지</span>
              <span>연간 활동량</span>
              <span>결과</span>
              <span />
            </div>
            {sources.map((source) => {
              const factorOptions = getFactorsForCategory(source.category, DEFAULT_SCOPE12_FACTORS);
              const selectedFactor = factorOptions.find((item) => item.name === source.fuelType);
              const units = selectedFactor && "units" in selectedFactor ? selectedFactor.units : [source.unit];
              const sourceInventory = calculateScope12Inventory({ sources: [source], facilities, boundaryApproach });
              const sourceFormula = sourceInventory.sourceFormulas[source.id];
              const scope = getScopeForCategory(source.category);
              const isScope2 = scope === "scope2";

              return (
                <React.Fragment key={source.id}>
                  <div className="source-row">
                    <select
                      value={source.category}
                      disabled={!licenseGate.canUseCoreFeatures}
                      onChange={(event) => updateSourceCategory(source, event.target.value as EmissionCategory)}
                    >
                      {calculationCategories.map((category) => (
                        <option key={category} value={category}>
                          {categoryLabels[category]}
                        </option>
                      ))}
                    </select>
                    <select
                      value={source.facilityId}
                      disabled={!licenseGate.canUseCoreFeatures}
                      onChange={(event) => updateSource(source.id, { facilityId: event.target.value })}
                    >
                      {facilities.map((facility) => (
                        <option key={facility.id} value={facility.id}>
                          {facility.name}
                        </option>
                      ))}
                    </select>
                    <input
                      value={source.description}
                      disabled={!licenseGate.canUseCoreFeatures}
                      onChange={(event) => updateSource(source.id, { description: event.target.value })}
                    />
                    <div className="factor-fields">
                      <select
                        value={source.fuelType}
                        disabled={!licenseGate.canUseCoreFeatures}
                        onChange={(event) => updateSourceFactor(source, event.target.value)}
                      >
                        {factorOptions.map((factor) => (
                          <option key={factor.name} value={factor.name}>
                            {factor.name}
                          </option>
                        ))}
                      </select>
                      <select
                        value={source.unit}
                        disabled={!licenseGate.canUseCoreFeatures}
                        onChange={(event) => updateSource(source.id, { unit: event.target.value })}
                      >
                        {units.map((unit) => (
                          <option key={unit} value={unit}>
                            {unit}
                          </option>
                        ))}
                      </select>
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={getAnnualQuantity(source)}
                      disabled={!licenseGate.canUseCoreFeatures}
                      onChange={(event) => updateAnnualQuantity(source.id, Number(event.target.value))}
                    />
                    <div className="result-cell" title={sourceFormula}>
                      {isScope2 ? (
                        <>
                          <strong>L {formatKgCO2eAsTCO2e(sourceInventory.scope2LocationTotal)}</strong>
                          <strong>M {formatKgCO2eAsTCO2e(sourceInventory.scope2MarketTotal)}</strong>
                        </>
                      ) : (
                        <>
                          <strong>{formatKgCO2eAsTCO2e(sourceInventory.scope1Total)}</strong>
                          <small>Scope 1</small>
                        </>
                      )}
                    </div>
                    <button type="button" className="ghost-button" disabled={!licenseGate.canUseCoreFeatures} onClick={() => removeSource(source.id)}>
                      삭제
                    </button>
                  </div>

                  {isScope2 && (
                    <div className="source-detail-card">
                      <div className="detail-header">
                        <div>
                          <p className="eyebrow">Scope 2 market-based</p>
                          <h3>전력 계약 수단 상세 입력</h3>
                        </div>
                        <p>Location-based는 총 사용량으로 계산하고, Market-based는 아래 power mix 입력을 우선 반영합니다.</p>
                      </div>

                      <div className="mix-toggle-grid">
                        {scope2MixOptions.map((option) => {
                          const enabled = Boolean(source.powerMix?.[option.key]);
                          return (
                            <label key={option.key} className={`mix-toggle ${enabled ? "enabled" : ""}`}>
                              <input
                                type="checkbox"
                                checked={enabled}
                                disabled={!licenseGate.canUseCoreFeatures}
                                onChange={(event) => togglePowerMixSection(source.id, option.key, event.target.checked)}
                              />
                              <span>{option.label}</span>
                            </label>
                          );
                        })}
                      </div>

                      <div className="mix-detail-grid">
                        {source.powerMix?.ppa && (
                          <section className="mix-card">
                            <h4>PPA 전력</h4>
                            <label>
                              연간 사용량
                              <input
                                type="number"
                                min="0"
                                value={getAnnualMixQuantity(source.powerMix.ppa.quantity)}
                                onChange={(event) => updatePowerMixAnnualQuantity(source.id, "ppa", Number(event.target.value))}
                              />
                            </label>
                            <label>
                              배출계수
                              <input
                                type="number"
                                min="0"
                                step="0.0001"
                                value={source.powerMix.ppa.factor}
                                onChange={(event) =>
                                  updatePowerMix(source.id, "ppa", (current) => ({
                                    ...current,
                                    factor: Number(event.target.value)
                                  }))
                                }
                              />
                            </label>
                            <label>
                              공급사명
                              <input
                                value={source.powerMix.ppa.supplierName || ""}
                                onChange={(event) =>
                                  updatePowerMix(source.id, "ppa", (current) => ({
                                    ...current,
                                    supplierName: event.target.value
                                  }))
                                }
                              />
                            </label>
                          </section>
                        )}

                        {source.powerMix?.rec && (
                          <section className="mix-card">
                            <h4>REC 전력</h4>
                            <label>
                              연간 사용량
                              <input
                                type="number"
                                min="0"
                                value={getAnnualMixQuantity(source.powerMix.rec.quantity)}
                                onChange={(event) => updatePowerMixAnnualQuantity(source.id, "rec", Number(event.target.value))}
                              />
                            </label>
                            <label className="checkbox-row">
                              <input
                                type="checkbox"
                                checked={source.powerMix.rec.meetsRequirements ?? true}
                                onChange={(event) =>
                                  updatePowerMix(source.id, "rec", (current) => ({
                                    ...current,
                                    meetsRequirements: event.target.checked
                                  }))
                                }
                              />
                              <span>인정 기준 충족</span>
                            </label>
                            <label>
                              인증서 번호
                              <input
                                value={source.powerMix.rec.certificateId || ""}
                                onChange={(event) =>
                                  updatePowerMix(source.id, "rec", (current) => ({
                                    ...current,
                                    certificateId: event.target.value
                                  }))
                                }
                              />
                            </label>
                          </section>
                        )}

                        {source.powerMix?.greenPremium && (
                          <section className="mix-card">
                            <h4>녹색프리미엄</h4>
                            <label>
                              연간 사용량
                              <input
                                type="number"
                                min="0"
                                value={getAnnualMixQuantity(source.powerMix.greenPremium.quantity)}
                                onChange={(event) =>
                                  updatePowerMixAnnualQuantity(source.id, "greenPremium", Number(event.target.value))
                                }
                              />
                            </label>
                            <label className="checkbox-row">
                              <input
                                type="checkbox"
                                checked={source.powerMix.greenPremium.treatAsRenewable ?? false}
                                onChange={(event) =>
                                  updatePowerMix(source.id, "greenPremium", (current) => ({
                                    ...current,
                                    treatAsRenewable: event.target.checked
                                  }))
                                }
                              />
                              <span>재생에너지 계약 수단으로 처리</span>
                            </label>
                            <label className="checkbox-row">
                              <input
                                type="checkbox"
                                checked={source.powerMix.greenPremium.supplierFactorProvided ?? false}
                                onChange={(event) =>
                                  updatePowerMix(source.id, "greenPremium", (current) => ({
                                    ...current,
                                    supplierFactorProvided: event.target.checked
                                  }))
                                }
                              />
                              <span>공급사 배출계수 사용</span>
                            </label>
                            <label>
                              공급사 배출계수
                              <input
                                type="number"
                                min="0"
                                step="0.0001"
                                value={source.powerMix.greenPremium.supplierFactor ?? 0}
                                onChange={(event) =>
                                  updatePowerMix(source.id, "greenPremium", (current) => ({
                                    ...current,
                                    supplierFactor: Number(event.target.value)
                                  }))
                                }
                              />
                            </label>
                          </section>
                        )}

                        {source.powerMix?.conventional && (
                          <section className="mix-card">
                            <h4>일반전력</h4>
                            <label>
                              연간 사용량
                              <input
                                type="number"
                                min="0"
                                value={getAnnualMixQuantity(source.powerMix.conventional.quantity)}
                                onChange={(event) =>
                                  updatePowerMixAnnualQuantity(source.id, "conventional", Number(event.target.value))
                                }
                              />
                            </label>
                            <label>
                              배출계수
                              <input
                                type="number"
                                min="0"
                                step="0.0001"
                                value={source.powerMix.conventional.factor}
                                onChange={(event) =>
                                  updatePowerMix(source.id, "conventional", (current) => ({
                                    ...current,
                                    factor: Number(event.target.value)
                                  }))
                                }
                              />
                            </label>
                            <label>
                              배출계수 기준
                              <select
                                value={source.powerMix.conventional.source}
                                onChange={(event) =>
                                  updatePowerMix(source.id, "conventional", (current) => ({
                                    ...current,
                                    source: event.target.value
                                  }))
                                }
                              >
                                <option value="national-average">국가 평균</option>
                                <option value="residual-mix">Residual mix</option>
                                <option value="supplier-specific">공급사 제공</option>
                              </select>
                            </label>
                          </section>
                        )}
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </section>

        <section className={`report-panel ${licenseGate.canGenerateReport ? "" : "locked-panel"}`}>
          <div className="results-header">
            <div>
              <p className="eyebrow">Report draft</p>
              <h2>9장 기준 보고서 입력 및 HTML 미리보기</h2>
              <p className="project-meta">이번 단계에서는 보고서 입력값 수집과 HTML 미리보기까지 연결했습니다. 다음 단계가 Word 생성입니다.</p>
            </div>
            <div className="button-row">
              <button type="button" disabled={!licenseGate.canGenerateReport || isExportingReport} onClick={() => void handleExportDocx()}>
                {isExportingReport ? "Word 생성 중" : "Word 초안 저장"}
              </button>
            </div>
          </div>

          {!licenseGate.canGenerateReport && <p className="lock-copy">라이선스 인증 후 보고서 생성 기능을 사용할 수 있습니다.</p>}
          {exportedReportPath && <p className="project-meta">저장 완료: {exportedReportPath}</p>}
          {exportError && <p className="error-copy">{exportError}</p>}

          <div className="report-layout">
            <div className="report-editor">
              <div className="report-form-grid">
                <label>
                  보고기간
                  <input
                    value={reportDraft.reportingPeriod}
                    disabled={!licenseGate.canGenerateReport}
                    onChange={(event) => updateReportDraft("reportingPeriod", event.target.value)}
                  />
                </label>
                <label>
                  담당 부서
                  <input
                    value={reportDraft.contactDepartment}
                    disabled={!licenseGate.canGenerateReport}
                    onChange={(event) => updateReportDraft("contactDepartment", event.target.value)}
                  />
                </label>
                <label>
                  담당자명
                  <input
                    value={reportDraft.contactName}
                    disabled={!licenseGate.canGenerateReport}
                    onChange={(event) => updateReportDraft("contactName", event.target.value)}
                  />
                </label>
                <label>
                  담당자 이메일
                  <input
                    value={reportDraft.contactEmail}
                    disabled={!licenseGate.canGenerateReport}
                    onChange={(event) => updateReportDraft("contactEmail", event.target.value)}
                  />
                </label>
                <label>
                  담당자 연락처
                  <input
                    value={reportDraft.contactPhone}
                    disabled={!licenseGate.canGenerateReport}
                    onChange={(event) => updateReportDraft("contactPhone", event.target.value)}
                  />
                </label>
                <label>
                  검증 상태
                  <select
                    value={reportDraft.verificationStatus}
                    disabled={!licenseGate.canGenerateReport}
                    onChange={(event) => updateReportDraft("verificationStatus", event.target.value as DesktopReportDraft["verificationStatus"])}
                  >
                    <option value="not_performed">미검증</option>
                    <option value="internal_review">내부 검토</option>
                    <option value="external_verification">외부 검증</option>
                  </select>
                </label>
              </div>

              <div className="report-form-stack">
                <label>
                  조직 경계 요약
                  <textarea
                    value={reportDraft.organizationalBoundarySummary}
                    disabled={!licenseGate.canGenerateReport}
                    onChange={(event) => updateReportDraft("organizationalBoundarySummary", event.target.value)}
                  />
                </label>
                <label>
                  운영 경계 요약
                  <textarea
                    value={reportDraft.operationalBoundarySummary}
                    disabled={!licenseGate.canGenerateReport}
                    onChange={(event) => updateReportDraft("operationalBoundarySummary", event.target.value)}
                  />
                </label>
                <label>
                  제외된 배출원 및 활동
                  <textarea
                    value={reportDraft.excludedActivitiesText}
                    disabled={!licenseGate.canGenerateReport}
                    onChange={(event) => updateReportDraft("excludedActivitiesText", event.target.value)}
                  />
                </label>
                <label>
                  산정 방법론 요약
                  <textarea
                    value={reportDraft.methodologySummary}
                    disabled={!licenseGate.canGenerateReport}
                    onChange={(event) => updateReportDraft("methodologySummary", event.target.value)}
                  />
                </label>
                <label>
                  배출계수 출처
                  <textarea
                    value={reportDraft.emissionFactorSourcesText}
                    disabled={!licenseGate.canGenerateReport}
                    onChange={(event) => updateReportDraft("emissionFactorSourcesText", event.target.value)}
                  />
                </label>
                <label>
                  기준연도 선정 사유
                  <textarea
                    value={reportDraft.baseYearSelectionReason}
                    disabled={!licenseGate.canGenerateReport}
                    onChange={(event) => updateReportDraft("baseYearSelectionReason", event.target.value)}
                  />
                </label>
                <label>
                  재산정 정책
                  <textarea
                    value={reportDraft.recalculationPolicy}
                    disabled={!licenseGate.canGenerateReport}
                    onChange={(event) => updateReportDraft("recalculationPolicy", event.target.value)}
                  />
                </label>
                <label>
                  검증 의견
                  <textarea
                    value={reportDraft.verificationOpinion}
                    disabled={!licenseGate.canGenerateReport}
                    onChange={(event) => updateReportDraft("verificationOpinion", event.target.value)}
                  />
                </label>
              </div>

              <div className="report-checklist">
                {reportChecklist.checklist.map((item) => (
                  <article key={item.id} className={`check-card-inline ${item.status}`}>
                    <div>
                      <strong>{item.label}</strong>
                      <p>{item.guidance}</p>
                    </div>
                    <span>{item.required ? "필수" : "선택"} · {item.status}</span>
                  </article>
                ))}
              </div>
            </div>

            <div className="report-preview">
              <div className="report-preview-header">
                <div>
                  <p className="eyebrow">HTML preview</p>
                  <h3>보고서 초안 미리보기</h3>
                </div>
                <div className="preview-meta">
                  <span>{companyName}</span>
                  <span>{reportingYear}</span>
                  <span>{boundaryApproachLabels[boundaryApproach]}</span>
                  <span>{verificationLabels[reportDraft.verificationStatus]}</span>
                </div>
              </div>
              <iframe className="report-preview-frame" srcDoc={reportChecklist.html} title="GHG report preview" />
            </div>
          </div>
        </section>

        <section className="grid">
          {reportGuideItems.map((topic) => (
            <article key={topic.title} className="card">
              <p className="eyebrow">GHG Protocol Chapter 9</p>
              <h3>{topic.title}</h3>
              <p>{topic.summary}</p>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
