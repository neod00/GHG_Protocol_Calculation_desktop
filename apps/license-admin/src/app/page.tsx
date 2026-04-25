import Link from "next/link";
import { getUpdatePolicy, listLicenses } from "./lib/release-store";

export default async function Page() {
  const [licenseRecords, updatePolicy] = await Promise.all([listLicenses(), getUpdatePolicy()]);

  return (
    <main className="admin-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Vercel admin app scaffold</p>
          <h1>GHG Desktop 라이선스 관리</h1>
          <p>
            고객, 라이선스 키, 만료일, 차단 상태, 활성 기기 수, 강제 업데이트 버전을 관리하는
            웹앱의 초기 구조입니다.
          </p>
        </div>
        <Link className="button-link" href="/download">
          다운로드 페이지 보기
        </Link>
      </header>

      <section className="panel">
        <div className="panel-header">
          <h2>라이선스</h2>
          <button type="button">라이선스 생성</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>고객</th>
              <th>라이선스 키</th>
              <th>상태</th>
              <th>만료일</th>
              <th>기기 수</th>
              <th>메모</th>
            </tr>
          </thead>
          <tbody>
            {licenseRecords.map((row) => (
              <tr key={row.key}>
                <td>{row.customer}</td>
                <td>{row.key}</td>
                <td>
                  <span className={`status-pill ${row.status}`}>{row.status}</span>
                </td>
                <td>{row.expiresAt}</td>
                <td>
                  {row.devices}/{row.maxDevices}
                </td>
                <td>{row.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h2>업데이트 정책</h2>
        <dl>
          <dt>latestVersion</dt>
          <dd>{updatePolicy.latestVersion}</dd>
          <dt>minimumSupportedVersion</dt>
          <dd>{updatePolicy.minimumSupportedVersion}</dd>
          <dt>forceUpdate</dt>
          <dd>{String(updatePolicy.forceUpdate)}</dd>
          <dt>downloadUrl</dt>
          <dd>{updatePolicy.downloadUrl}</dd>
          <dt>sha256</dt>
          <dd>{updatePolicy.sha256}</dd>
        </dl>
      </section>

      <section className="panel compact-panel">
        <h2>운영 API</h2>
        <div className="api-grid">
          <code>GET /api/updates/latest</code>
          <span>앱 업데이트 메타데이터 조회</span>
          <code>POST /api/licenses/verify</code>
          <span>라이선스 키, 앱 버전, 디바이스 해시 검증</span>
        </div>
      </section>
    </main>
  );
}
