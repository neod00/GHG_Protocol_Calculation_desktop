import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
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

function App() {
  const [licenseKey, setLicenseKey] = useState("");
  const [licenseResult, setLicenseResult] = useState<LicenseVerificationResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);

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

  const licenseGate = useMemo(() => buildLicenseGate(licenseResult), [licenseResult]);
  const statusText = getStatusText(licenseResult);

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
            <h1>GHG Protocol Scope 1/2 보고서 작성 도구</h1>
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

        <section className="hero-panel">
          <div>
            <h2>민감 데이터는 로컬에 저장하고, 보고서는 Word/PDF/HTML로 생성합니다.</h2>
            <p>
              이 초기 화면은 Tauri 전환을 위한 스캐폴딩입니다. 다음 단계에서 기존 Scope 1/2
              계산 로직과 보고서 템플릿을 이식합니다.
            </p>
          </div>
        </section>

        <section className="service-panel">
          <div>
            <p className="eyebrow">Operations</p>
            <h2>라이선스 서버 연결 준비됨</h2>
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

