export interface GuideTopic {
  id: string;
  title: string;
  summary: string;
  reportSection: string;
}

export const chapter9GuideTopics: GuideTopic[] = [
  {
    id: "inventory-boundary",
    title: "기업 및 인벤토리 경계",
    summary: "선택한 연결 접근법, 조직경계, 운영경계, 보고 기간을 명확히 설명해야 합니다.",
    reportSection: "1. 인벤토리 경계"
  },
  {
    id: "emissions-information",
    title: "배출량에 대한 정보",
    summary: "Scope 1과 Scope 2 배출량, 온실가스별 배출량, 산정 방법론과 배출계수 출처를 포함해야 합니다.",
    reportSection: "2. 배출량 정보"
  },
  {
    id: "base-year",
    title: "기준연도 및 재계산 정책",
    summary: "기준연도, 기준연도 배출량, 구조 변화 또는 방법론 변경 시 재계산 정책을 설명해야 합니다.",
    reportSection: "3. 기준연도 관리"
  },
  {
    id: "verification",
    title: "검증 및 투명성",
    summary: "외부 검증 여부, 제외 항목, 담당자 연락처, 보고의 한계를 명시해야 합니다.",
    reportSection: "4. 검증 및 부록"
  }
];
