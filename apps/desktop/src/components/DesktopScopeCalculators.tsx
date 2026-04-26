import { BoundaryApproach, EmissionCategory, EmissionSource, Facility, Scope12FactorSet } from "@ghg/core";
import { DesktopEmissionSourceCard } from "./DesktopEmissionSourceCard";

interface DesktopScopeCalculatorsProps {
  sources: EmissionSource[];
  facilities: Facility[];
  boundaryApproach: BoundaryApproach;
  factorSet: Scope12FactorSet;
  openCategory: EmissionCategory | null;
  disabled: boolean;
  reportingYear: string;
  onToggleCategory: (category: EmissionCategory) => void;
  onAddSource: (category: EmissionCategory) => void;
  onRemoveSource: (sourceId: string) => void;
  onUpdateSource: (sourceId: string, patch: Partial<EmissionSource>) => void;
  onFuelTypeChange: (source: EmissionSource, fuelType: string) => void;
  onTogglePowerMixSection: (sourceId: string, mixKey: Scope2MixKey, enabled: boolean) => void;
  onUpdatePowerMixAnnualQuantity: (sourceId: string, mixKey: Scope2MixKey, annualQuantity: number) => void;
  onUpdatePowerMix: (
    sourceId: string,
    mixKey: Scope2MixKey,
    updater: (current: Record<string, unknown> | undefined) => Record<string, unknown> | undefined
  ) => void;
}

type Scope2MixKey = "ppa" | "rec" | "greenPremium" | "conventional";

const scope1Categories = [
  EmissionCategory.StationaryCombustion,
  EmissionCategory.MobileCombustion,
  EmissionCategory.ProcessEmissions,
  EmissionCategory.FugitiveEmissions,
  EmissionCategory.Waste
];

const scope2Categories = [EmissionCategory.PurchasedEnergy];

const categoryLabels: Record<EmissionCategory, string> = {
  [EmissionCategory.StationaryCombustion]: "Scope 1 - 고정연소",
  [EmissionCategory.MobileCombustion]: "Scope 1 - 이동연소",
  [EmissionCategory.ProcessEmissions]: "Scope 1 - 공정배출",
  [EmissionCategory.FugitiveEmissions]: "Scope 1 - 탈루배출",
  [EmissionCategory.Waste]: "Scope 1 - 폐기물",
  [EmissionCategory.PurchasedEnergy]: "Scope 2 - 구매전력",
  [EmissionCategory.PurchasedGoodsAndServices]: "Scope 3 - 구매한 제품 및 서비스",
  [EmissionCategory.CapitalGoods]: "Scope 3 - 자본재",
  [EmissionCategory.FuelAndEnergyRelatedActivities]: "Scope 3 - 연료 및 에너지 관련 활동",
  [EmissionCategory.UpstreamTransportationAndDistribution]: "Scope 3 - 업스트림 운송 및 유통",
  [EmissionCategory.WasteGeneratedInOperations]: "Scope 3 - 운영 중 발생 폐기물",
  [EmissionCategory.BusinessTravel]: "Scope 3 - 출장",
  [EmissionCategory.EmployeeCommuting]: "Scope 3 - 직원 통근",
  [EmissionCategory.UpstreamLeasedAssets]: "Scope 3 - 업스트림 임차자산",
  [EmissionCategory.DownstreamTransportationAndDistribution]: "Scope 3 - 다운스트림 운송 및 유통",
  [EmissionCategory.ProcessingOfSoldProducts]: "Scope 3 - 판매제품 가공",
  [EmissionCategory.UseOfSoldProducts]: "Scope 3 - 판매제품 사용",
  [EmissionCategory.EndOfLifeTreatmentOfSoldProducts]: "Scope 3 - 판매제품 폐기",
  [EmissionCategory.DownstreamLeasedAssets]: "Scope 3 - 다운스트림 임대자산",
  [EmissionCategory.Franchises]: "Scope 3 - 프랜차이즈",
  [EmissionCategory.Investments]: "Scope 3 - 투자"
};

const categoryDescriptions: Record<EmissionCategory, string> = {
  [EmissionCategory.StationaryCombustion]: "보일러, 로, 발전기 등 고정 설비에서 연료를 연소해 발생하는 직접 배출입니다.",
  [EmissionCategory.MobileCombustion]: "회사 소유 또는 통제 차량, 장비, 선박 등 이동연소 배출원입니다.",
  [EmissionCategory.ProcessEmissions]: "연료 연소가 아닌 화학적 또는 물리적 공정에서 발생하는 직접 배출입니다.",
  [EmissionCategory.FugitiveEmissions]: "냉매, 소화설비, 가스 누출 등 의도하지 않은 배출입니다.",
  [EmissionCategory.Waste]: "사업장 내에서 직접 처리하는 폐기물과 관련된 Scope 1 배출입니다.",
  [EmissionCategory.PurchasedEnergy]: "구매 전력, 열, 스팀 등 에너지 사용에 따른 Scope 2 배출입니다.",
  [EmissionCategory.PurchasedGoodsAndServices]: "Scope 3는 표준 데스크탑 제품에서 개별 문의로 제공합니다.",
  [EmissionCategory.CapitalGoods]: "Scope 3는 표준 데스크탑 제품에서 개별 문의로 제공합니다.",
  [EmissionCategory.FuelAndEnergyRelatedActivities]: "Scope 3는 표준 데스크탑 제품에서 개별 문의로 제공합니다.",
  [EmissionCategory.UpstreamTransportationAndDistribution]: "Scope 3는 표준 데스크탑 제품에서 개별 문의로 제공합니다.",
  [EmissionCategory.WasteGeneratedInOperations]: "Scope 3는 표준 데스크탑 제품에서 개별 문의로 제공합니다.",
  [EmissionCategory.BusinessTravel]: "Scope 3는 표준 데스크탑 제품에서 개별 문의로 제공합니다.",
  [EmissionCategory.EmployeeCommuting]: "Scope 3는 표준 데스크탑 제품에서 개별 문의로 제공합니다.",
  [EmissionCategory.UpstreamLeasedAssets]: "Scope 3는 표준 데스크탑 제품에서 개별 문의로 제공합니다.",
  [EmissionCategory.DownstreamTransportationAndDistribution]: "Scope 3는 표준 데스크탑 제품에서 개별 문의로 제공합니다.",
  [EmissionCategory.ProcessingOfSoldProducts]: "Scope 3는 표준 데스크탑 제품에서 개별 문의로 제공합니다.",
  [EmissionCategory.UseOfSoldProducts]: "Scope 3는 표준 데스크탑 제품에서 개별 문의로 제공합니다.",
  [EmissionCategory.EndOfLifeTreatmentOfSoldProducts]: "Scope 3는 표준 데스크탑 제품에서 개별 문의로 제공합니다.",
  [EmissionCategory.DownstreamLeasedAssets]: "Scope 3는 표준 데스크탑 제품에서 개별 문의로 제공합니다.",
  [EmissionCategory.Franchises]: "Scope 3는 표준 데스크탑 제품에서 개별 문의로 제공합니다.",
  [EmissionCategory.Investments]: "Scope 3는 표준 데스크탑 제품에서 개별 문의로 제공합니다."
};

export function DesktopScopeCalculators(props: DesktopScopeCalculatorsProps) {
  return (
    <div className="space-y-8">
      <section>
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-600">Scope 1</p>
          <h3 className="text-xl font-bold text-slate-950">직접 배출원 입력</h3>
        </div>
        <div className="space-y-4">
          {scope1Categories.map((category) => (
            <DesktopEmissionSourceCard
              key={category}
              category={category}
              label={categoryLabels[category]}
              description={categoryDescriptions[category]}
              sources={props.sources.filter((source) => source.category === category)}
              facilities={props.facilities}
              boundaryApproach={props.boundaryApproach}
              factorSet={props.factorSet}
              isOpen={props.openCategory === category}
              disabled={props.disabled}
              reportingYear={props.reportingYear}
              onToggle={() => props.onToggleCategory(category)}
              onAddSource={() => props.onAddSource(category)}
              onRemoveSource={props.onRemoveSource}
              onUpdateSource={props.onUpdateSource}
              onFuelTypeChange={props.onFuelTypeChange}
              onTogglePowerMixSection={props.onTogglePowerMixSection}
              onUpdatePowerMixAnnualQuantity={props.onUpdatePowerMixAnnualQuantity}
              onUpdatePowerMix={props.onUpdatePowerMix}
            />
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-600">Scope 2</p>
          <h3 className="text-xl font-bold text-slate-950">간접 에너지 배출원 입력</h3>
        </div>
        <div className="space-y-4">
          {scope2Categories.map((category) => (
            <DesktopEmissionSourceCard
              key={category}
              category={category}
              label={categoryLabels[category]}
              description={categoryDescriptions[category]}
              sources={props.sources.filter((source) => source.category === category)}
              facilities={props.facilities}
              boundaryApproach={props.boundaryApproach}
              factorSet={props.factorSet}
              isOpen={props.openCategory === category}
              disabled={props.disabled}
              reportingYear={props.reportingYear}
              onToggle={() => props.onToggleCategory(category)}
              onAddSource={() => props.onAddSource(category)}
              onRemoveSource={props.onRemoveSource}
              onUpdateSource={props.onUpdateSource}
              onFuelTypeChange={props.onFuelTypeChange}
              onTogglePowerMixSection={props.onTogglePowerMixSection}
              onUpdatePowerMixAnnualQuantity={props.onUpdatePowerMixAnnualQuantity}
              onUpdatePowerMix={props.onUpdatePowerMix}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
