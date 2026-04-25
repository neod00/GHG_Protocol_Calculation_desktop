import React from "react";
import { createRoot } from "react-dom/client";
import { chapter9GuideTopics } from "@ghg/protocol-guide";
import "./styles.css";

function App() {
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark">GHG</div>
        <nav>
          <a className="active">Scope 1/2 계산</a>
          <a>보고서 생성</a>
          <a>배출계수</a>
          <a>Scope 3 개별 문의</a>
          <a>설정</a>
        </nav>
      </aside>
      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Local-first desktop app</p>
            <h1>GHG Protocol Scope 1/2 보고서 작성 도구</h1>
          </div>
          <button type="button">새 프로젝트</button>
        </header>
        <section className="hero-panel">
          <div>
            <h2>민감 데이터는 로컬에 저장하고, 보고서는 Word/PDF/HTML로 생성합니다.</h2>
            <p>이 초기 화면은 Tauri 전환을 위한 스캐폴딩입니다. 다음 단계에서 기존 Scope 1/2 계산 로직과 보고서 템플릿을 이식합니다.</p>
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
