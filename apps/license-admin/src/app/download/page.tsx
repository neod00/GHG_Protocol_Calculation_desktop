import Link from "next/link";
import { getUpdatePolicy } from "../lib/release-store";

const installerName = "GHG-Desktop-0.1.0-beta.1-x64.msi";

export default async function DownloadPage() {
  const updatePolicy = await getUpdatePolicy();

  return (
    <main className="admin-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Unsigned Windows beta</p>
          <h1>GHG Desktop 베타 다운로드</h1>
          <p>
            이 버전은 초기 베타이며 Windows 코드 서명이 아직 적용되지 않았습니다. 설치 시
            SmartScreen 경고가 표시될 수 있습니다.
          </p>
        </div>
        <Link className="button-link secondary" href="/">
          관리자 화면
        </Link>
      </header>

      <section className="warning-band">
        <strong>설치 전 확인</strong>
        <span>
          경고 화면이 표시되면 설치 파일의 버전과 SHA-256 값을 확인한 뒤, `추가 정보`와 `실행`을
          선택해 진행합니다.
        </span>
      </section>

      <section className="download-layout">
        <article className="panel">
          <h2>설치 파일</h2>
          <dl>
            <dt>버전</dt>
            <dd>{updatePolicy.latestVersion}</dd>
            <dt>운영체제</dt>
            <dd>Windows x64</dd>
            <dt>파일명</dt>
            <dd>{installerName}</dd>
            <dt>SHA-256</dt>
            <dd>{updatePolicy.sha256}</dd>
            <dt>배포일</dt>
            <dd>{updatePolicy.releaseDate}</dd>
          </dl>
          <a className="download-button" href={updatePolicy.downloadUrl}>
            MSI 다운로드
          </a>
        </article>

        <article className="panel">
          <h2>설치 방법</h2>
          <ol className="step-list">
            <li>설치 파일을 다운로드합니다.</li>
            <li>다운로드한 MSI 파일을 실행합니다.</li>
            <li>Windows 보호 화면이 표시되면 `추가 정보`를 클릭합니다.</li>
            <li>`실행`을 클릭해 설치를 진행합니다.</li>
            <li>설치 후 앱을 실행하고 라이선스 키를 입력합니다.</li>
          </ol>
        </article>
      </section>

      <section className="panel">
        <h2>업데이트 및 라이선스 안내</h2>
        <p className="body-copy">
          앱은 시작 시 최신 버전을 확인합니다. 중요 보안/정책 업데이트는 강제 업데이트로 적용될
          수 있으며, 라이선스가 만료되거나 차단된 경우 일부 기능 또는 앱 실행이 제한될 수 있습니다.
        </p>
      </section>
    </main>
  );
}
