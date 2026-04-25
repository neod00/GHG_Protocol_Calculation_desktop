# Chapter 9 Field Mapping

## 목적

이 문서는 `ghg-protocol-revised_kor.pdf` 9장 보고 요구사항과 데스크탑 앱의 입력 필드를 1:1로 연결하기 위한 기준 문서다.

이후 작업 원칙:

- 보고서 렌더러는 이 매핑을 기준으로 필수/선택 항목을 구성한다.
- 체크리스트는 이 매핑을 기준으로 완성 여부를 판단한다.
- PDF, DOCX, HTML은 같은 구조를 사용한다.

## 필수 항목 매핑

| 9장 요구사항 | 앱 필드 | 저장 위치 | 출력 위치 |
|---|---|---|---|
| 기업명 | `companyName` | `DesktopProjectData` | 표지, 경계 섹션 |
| 보고연도 | `reportingYear` | `DesktopProjectData` | 표지, 메타 블록 |
| 보고기간 | `reportingPeriod` | `DesktopReportDraft` | 표지, 메타 블록 |
| 조직 경계 설명 | `organizationalBoundarySummary` | `DesktopReportDraft` | 기업 및 인벤토리 경계 |
| 조직 경계 접근법 | `boundaryApproach` | `DesktopProjectData` | 메타 블록, 체크리스트 |
| 운영 경계 설명 | `operationalBoundarySummary` | `DesktopReportDraft` | 기업 및 인벤토리 경계 |
| 포함 Scope | 계산 엔진 고정값 `scope1/scope2` | `Chapter9ReportData.inventoryBoundary.includedScopes` | 체크리스트, 경계 섹션 |
| 제외된 배출원/활동 | `excludedActivitiesText` | `DesktopReportDraft` | 경계 섹션 |
| Scope 1 총량 | 계산 결과 | `ReportTotals.scope1Tco2e` | 요약 표 |
| Scope 2 Location-based 총량 | 계산 결과 | `ReportTotals.scope2LocationTco2e` | 요약 표 |
| Scope 2 Market-based 총량 | 계산 결과 | `ReportTotals.scope2MarketTco2e` | 요약 표 |
| 배출원 상세 | `sources` | `DesktopProjectData` | 부록 A |
| 산정 방법론 | `methodologySummary` | `DesktopReportDraft` | 방법론 섹션 |
| 배출계수 출처 | `emissionFactorSourcesText` | `DesktopReportDraft` | 방법론 섹션 |
| 데이터 품질 메모 | `dataQualityNotesText` | `DesktopReportDraft` | 방법론 섹션 |
| 불확실성/한계 | `uncertaintyNotesText` | `DesktopReportDraft` | 방법론 섹션 |
| 기준연도 선정 사유 | `baseYearSelectionReason` | `DesktopReportDraft` | 기준연도 섹션 |
| 재산정 정책 | `recalculationPolicy` | `DesktopReportDraft` | 기준연도 섹션 |
| 검증 상태 | `verificationStatus` | `DesktopReportDraft` | 검증 섹션 |
| 담당 부서 | `contactDepartment` | `DesktopReportDraft` | 담당자 섹션 |
| 담당자명 | `contactName` | `DesktopReportDraft` | 담당자 섹션 |
| 담당자 이메일 | `contactEmail` | `DesktopReportDraft` | 담당자 섹션 |
| 담당자 연락처 | `contactPhone` | `DesktopReportDraft` | 담당자 섹션 |

## 선택 항목 매핑

| 9장 선택 항목 | 앱 필드 | 저장 위치 | 출력 위치 |
|---|---|---|---|
| 검증기관/검토자 | `verifierName` | `DesktopReportDraft` | 검증 섹션 |
| 검증 기준 | `verificationStandard` | `DesktopReportDraft` | 검증 섹션 |
| 검증 의견 | `verificationOpinion` | `DesktopReportDraft` | 검증 섹션 |
| 비율 지표 | `optionalIntensityMetricsText` | `DesktopReportDraft` | 선택 공시 섹션 |
| 감축 프로그램 | `optionalReductionInitiativesText` | `DesktopReportDraft` | 선택 공시 섹션 |
| 에너지 계약/제도 | `optionalEnergyProgramsText` | `DesktopReportDraft` | 선택 공시 섹션 |
| 기타 선택 공시 | `optionalOtherDisclosuresText` | `DesktopReportDraft` | 선택 공시 섹션 |
| 시설별 요약 | 계산 결과 | `facilitySummaries` | 시설별 배출량 섹션 |

## 체크리스트 원칙

필수 항목:

- 값이 없으면 `missing`
- 값이 있으면 `complete`

선택 항목:

- 값이 없으면 `partial`
- 값이 있으면 `complete`

## 후속 원칙

1. PDF, DOCX, HTML은 이 매핑 문서를 기준으로 같은 항목을 출력한다.
2. 새로운 보고서 필드를 추가할 때는 먼저 이 문서를 갱신한다.
3. 사용자가 직접 입력하지 않는 값은 계산 결과 또는 시스템 기본값에서 채운다.
