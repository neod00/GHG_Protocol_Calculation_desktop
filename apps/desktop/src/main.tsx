import React, { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  calculateScope12Inventory,
  DEFAULT_SCOPE12_FACTORS,
  EmissionCategory,
  EmissionSource,
  Facility,
  formatKgCO2eAsTCO2e,
  getFactorsForCategory,
  getScopeForCategory,
  Scope12FactorSet
} from "@ghg/core";
import { chapter9GuideTopics } from "@ghg/protocol-guide";
import { LICENSE_VERIFY_URL, UPDATE_METADATA_URL } from "./config";
import { buildLicenseGate } from "./licenseGate";
import { LicenseVerificationResult, verifyLicense } from "./licenseClient";
import {
  createProjectEnvelope,
  DesktopProjectData,
  DesktopProjectListItem,
  listDesktopProjects,
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
  [EmissionCategory.FugitiveEmissions]: "Scope 1 - 탈루배출",
  [EmissionCategory.Waste]: "Scope 1 - 사업장 폐기물",
  [EmissionCategory.PurchasedEnergy]: "Scope 2 - 구매 에너지"
};

const defaultFacilities: Facility[] = [
  { id: "facility-headquarters", name: "본사", equityShare: 100 },
  { id: "facility-plant", name: "공장", equityShare: 100 }
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
  const unit = "units" in factor ? factor.units[0] : "kg";
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

function createDefaultProjectData(): DesktopProjectData {
  return {
    companyName: "샘플 회사",
    reportingYear: new Date().getFullYear().toString(),
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
    ]
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

function App() {
  const [licenseKey, setLicenseKey] = useState("");
  const [licenseResult, setLicenseResult] = useState<LicenseVerificationResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const [projectId, setProjectId] = useState(createProjectId());
  const [projectName, setProjectName] = useState("기본 프로젝트");
  const [companyName, setCompanyName] = useState("샘플 회사");
  const [reportingYear, setReportingYear] = useState(new Date().getFullYear().toString());
  const [facilities, setFacilities] = useState<Facility[]>(defaultFacilities);
  const [boundaryApproach, setBoundaryApproach] = useState<"operational" | "financial" | "equity">("operational");
  const [sources, setSources] = useState<EmissionSource[]>(createDefaultProjectData().sources);
  const [projectList, setProjectList] = useState<DesktopProjectListItem[]>([]);
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
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
        const [lastProject, projects] = await Promise.all([
          loadLastDesktopProject(),
          listDesktopProjects()
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
          setLastSavedAt(lastProject.updatedAt);
        }

        setProjectList(projects);
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

  async function refreshProjectList() {
    setProjectList(await listDesktopProjects());
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
        sources
      }
    });

    setSaveState("saving");
    setSaveError(null);

    try {
      await saveDesktopProject(payload);
      setSaveState("saved");
      setLastSavedAt(payload.updatedAt);
      await refreshProjectList();
    } catch (error) {
      setSaveState("error");
      setSaveError(error instanceof Error ? error.message : "프로젝트 저장에 실패했습니다.");
    }
  }

  useEffect(() => {
    if (!hydratedRef.current) return;
    const timeout = window.setTimeout(() => void persistProject(), 500);
    return () => window.clearTimeout(timeout);
  }, [projectId, projectName, companyName, reportingYear, boundaryApproach, facilities, sources]);

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
    setLastSavedAt(null);
    setSaveState("idle");
    setSaveError(null);
  }

  function addSource(category: EmissionCategory) {
    setSources((current) => [...current, createSource(category, DEFAULT_SCOPE12_FACTORS, facilities[0].id)]);
  }

  function updateSource(sourceId: string, patch: Partial<EmissionSource>) {
    setSources((current) =>
      current.map((source) => (source.id === sourceId ? { ...source, ...patch } : source))
    );
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
        source.id === sourceId
          ? { ...source, monthlyQuantities: toMonthlyArray(annualQuantity) }
          : source
      )
    );
  }

  function updatePowerMix(sourceId: string, mixKey: Scope2MixKey, updater: (current: any | undefined) => any | undefined) {
    setSources((current) =>
      current.map((source) => {
        if (source.id !== sourceId) return source;
        const currentMix = source.powerMix || {};
        const nextEntry = updater(currentMix[mixKey]);
        const nextMix = { ...currentMix };

        if (typeof nextEntry === "undefined") {
          delete nextMix[mixKey];
        } else {
          nextMix[mixKey] = nextEntry;
        }

        return {
          ...source,
          powerMix: Object.keys(nextMix).length > 0 ? nextMix : undefined
        };
      })
    );
  }

  function togglePowerMixSection(sourceId: string, mixKey: Scope2MixKey, enabled: boolean, unit: string) {
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

  const licenseGate = useMemo(() => buildLicenseGate(licenseResult), [licenseResult]);
  const statusText = getStatusText(licenseResult);
  const results = useMemo(
    () => calculateScope12Inventory({ sources, facilities, boundaryApproach }),
    [sources, facilities, boundaryApproach]
  );

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
                {disabled && <small>잠김</small>}
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
                상태: {isLoadingProject ? "불러오는 중" : saveState === "saving" ? "저장 중" : saveState === "saved" ? "저장됨" : saveState === "error" ? "오류" : "대기"}
                {" · "}최근 저장: {formatTimestamp(lastSavedAt)}
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
              <select value={boundaryApproach} onChange={(event) => setBoundaryApproach(event.target.value as typeof boundaryApproach)}>
                <option value="operational">운영 통제</option>
                <option value="financial">재무 통제</option>
                <option value="equity">지분율</option>
              </select>
            </label>
          </div>
        </section>

        <section className="license-panel">
          <div>
            <p className="eyebrow">License</p>
            <h2>라이선스 확인</h2>
            <p>발급받은 라이선스 키를 입력하면 앱 사용 가능 상태를 서버에서 확인합니다.</p>
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
            <p>연료 사용량, 전력 사용량, 시설 정보, 배출원 정보, 계산 결과는 데스크탑의 로컬 SQLite에 저장됩니다.</p>
          </div>
          <div className="privacy-grid">
            <article>
              <h3>로컬 SQLite 저장</h3>
              <p>프로젝트명, 회사명, 보고연도, 시설, 배출원, 월별 활동량, 계산용 설정값을 자동 저장합니다.</p>
            </article>
            <article>
              <h3>외부로 전송됨</h3>
              <p>라이선스 확인용 `licenseKey`, `appVersion`, `deviceIdHash`와 업데이트 확인 요청만 전송됩니다.</p>
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
            <h2>{licenseGate.canUseCoreFeatures ? "핵심 기능 사용 가능" : "핵심 기능 잠김"}</h2>
            <p>{licenseGate.reasonText}</p>
          </div>
          <div className="feature-grid">
            <span className={licenseGate.canCreateProject ? "enabled" : "disabled"}>프로젝트 생성</span>
            <span className={licenseGate.canGenerateReport ? "enabled" : "disabled"}>보고서 생성</span>
            <span className={licenseGate.canEditEmissionFactors ? "enabled" : "disabled"}>배출계수 편집</span>
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
              <span>총 배출량 Market 기준</span>
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
                        <p>Location-based는 총 사용량으로 계산하고, Market-based는 아래 power mix를 우선 반영합니다.</p>
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
                                onChange={(event) => togglePowerMixSection(source.id, option.key, event.target.checked, source.unit)}
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
                              <span>품질 기준 충족</span>
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
                                onChange={(event) => updatePowerMixAnnualQuantity(source.id, "greenPremium", Number(event.target.value))}
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
                              <span>재생에너지 계약수단으로 처리</span>
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
                                onChange={(event) => updatePowerMixAnnualQuantity(source.id, "conventional", Number(event.target.value))}
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

        <section className="grid">
          {chapter9GuideTopics.map((topic) => (
            <article key={topic.id} className="card">
              <p className="eyebrow">{topic.reportSection}</p>
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
