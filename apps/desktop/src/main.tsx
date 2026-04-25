import React, { FormEvent, useEffect, useMemo, useState } from "react";
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

const initialFacilities: Facility[] = [
  { id: "facility-headquarters", name: "본사", equityShare: 100 },
  { id: "facility-plant", name: "공장", equityShare: 100 }
];

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

function getAnnualQuantity(source: EmissionSource): number {
  return source.monthlyQuantities.reduce((sum, value) => sum + value, 0);
}

function App() {
  const [licenseKey, setLicenseKey] = useState("");
  const [licenseResult, setLicenseResult] = useState<LicenseVerificationResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [facilities] = useState<Facility[]>(initialFacilities);
  const [boundaryApproach, setBoundaryApproach] = useState<"operational" | "financial" | "equity">("operational");
  const [sources, setSources] = useState<EmissionSource[]>([
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
  ]);

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
      description: categoryLabels[category]
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
          ? { ...source, monthlyQuantities: Array(12).fill((Number.isFinite(annualQuantity) ? annualQuantity : 0) / 12) }
          : source
      )
    );
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
          <button type="button" disabled={!licenseGate.canCreateProject}>
            새 프로젝트
          </button>
        </header>

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
            <label>
              조직 경계
              <select value={boundaryApproach} onChange={(event) => setBoundaryApproach(event.target.value as typeof boundaryApproach)}>
                <option value="operational">운영 통제</option>
                <option value="financial">재무 통제</option>
                <option value="equity">지분율</option>
              </select>
            </label>
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
              const sourceResult = calculateScope12Inventory({ sources: [source], facilities, boundaryApproach }).sourceFormulas[source.id];
              const scope = getScopeForCategory(source.category);
              const facilityResult = calculateScope12Inventory({ sources: [source], facilities, boundaryApproach });
              const rowEmission = scope === "scope2" ? facilityResult.scope2MarketTotal : facilityResult.scope1Total;

              return (
                <div className="source-row" key={source.id}>
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
                  <div className="result-cell" title={sourceResult}>
                    <strong>{formatKgCO2eAsTCO2e(rowEmission)}</strong>
                    <small>{scope === "scope2" ? "Market 기준" : "Scope 1"}</small>
                  </div>
                  <button type="button" className="ghost-button" disabled={!licenseGate.canUseCoreFeatures} onClick={() => removeSource(source.id)}>
                    삭제
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <section className="service-panel">
          <div>
            <p className="eyebrow">Operations</p>
            <h2>라이선스 서버 연결</h2>
          </div>
          <dl>
            <dt>License API</dt>
            <dd>{LICENSE_VERIFY_URL}</dd>
            <dt>Update API</dt>
            <dd>{UPDATE_METADATA_URL}</dd>
          </dl>
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
