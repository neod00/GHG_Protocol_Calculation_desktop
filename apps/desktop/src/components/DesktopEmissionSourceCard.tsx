import React, { useMemo } from "react";
import {
  BoundaryApproach,
  calculateScope12Inventory,
  CO2eFactorFuel,
  DEFAULT_SCOPE12_FACTORS,
  EmissionCategory,
  EmissionSource,
  Facility,
  formatKgCO2eAsTCO2e,
  getFactorsForCategory,
  getScopeForCategory,
  Refrigerant
} from "@ghg/core";
import {
  IconBuilding,
  IconCar,
  IconChevronDown,
  IconFactory,
  IconFire,
  IconFugitive,
  IconInfo,
  IconPlus,
  IconProcess,
  IconTrash,
  IconWaste,
  IconZap
} from "./IconComponents";

type Factor = CO2eFactorFuel | Refrigerant;

interface DesktopEmissionSourceCardProps {
  category: EmissionCategory;
  label: string;
  description: string;
  sources: EmissionSource[];
  facilities: Facility[];
  boundaryApproach: BoundaryApproach;
  isOpen: boolean;
  disabled: boolean;
  reportingYear: string;
  onToggle: () => void;
  onAddSource: () => void;
  onRemoveSource: (sourceId: string) => void;
  onUpdateSource: (sourceId: string, patch: Partial<EmissionSource>) => void;
  onFuelTypeChange: (source: EmissionSource, fuelType: string) => void;
}

const monthLabels = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];

function getCategoryIcon(category: EmissionCategory) {
  const className = "h-7 w-7";
  switch (category) {
    case EmissionCategory.StationaryCombustion:
      return <IconFactory className={className} />;
    case EmissionCategory.MobileCombustion:
      return <IconCar className={className} />;
    case EmissionCategory.ProcessEmissions:
      return <IconProcess className={className} />;
    case EmissionCategory.FugitiveEmissions:
      return <IconFugitive className={className} />;
    case EmissionCategory.Waste:
      return <IconWaste className={className} />;
    case EmissionCategory.PurchasedEnergy:
      return <IconZap className={className} />;
    default:
      return <IconFire className={className} />;
  }
}

function getFactorUnitOptions(factor: Factor | undefined, fallbackUnit: string): string[] {
  if (!factor) return [fallbackUnit];
  if ("units" in factor) return factor.units;
  return [fallbackUnit || "kg"];
}

function getAnnualQuantity(source: EmissionSource): number {
  return source.monthlyQuantities.reduce((sum, value) => sum + value, 0);
}

function updateMonthlyValue(source: EmissionSource, monthIndex: number, value: number): number[] {
  const next = Array.isArray(source.monthlyQuantities) && source.monthlyQuantities.length === 12
    ? [...source.monthlyQuantities]
    : Array(12).fill(0);
  next[monthIndex] = Number.isFinite(value) ? value : 0;
  return next;
}

export function DesktopEmissionSourceCard({
  category,
  label,
  description,
  sources,
  facilities,
  boundaryApproach,
  isOpen,
  disabled,
  reportingYear,
  onToggle,
  onAddSource,
  onRemoveSource,
  onUpdateSource,
  onFuelTypeChange
}: DesktopEmissionSourceCardProps) {
  const scope = getScopeForCategory(category);
  const factors = getFactorsForCategory(category, DEFAULT_SCOPE12_FACTORS);
  const categoryInventory = useMemo(
    () => calculateScope12Inventory({ sources, facilities, boundaryApproach }),
    [sources, facilities, boundaryApproach]
  );

  const subtotal = scope === "scope2" ? categoryInventory.scope2MarketTotal : categoryInventory.scope1Total;

  return (
    <article className={`rounded-2xl border bg-white shadow-sm ${disabled ? "border-slate-200 opacity-60" : "border-slate-200"}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-4 p-6 text-left disabled:cursor-not-allowed"
      >
        <div className="flex gap-4">
          <span className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">{getCategoryIcon(category)}</span>
          <div>
            <h3 className="text-lg font-bold text-slate-950">{label}</h3>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">{description}</p>
            <p className="mt-3 text-sm font-semibold text-slate-700">
              소계 {formatKgCO2eAsTCO2e(subtotal)}
              <span className="ml-2 font-normal text-slate-400">{scope === "scope2" ? "Market-based 기준" : "Scope 1 기준"}</span>
            </p>
          </div>
        </div>
        <IconChevronDown className={`mt-2 h-5 w-5 text-slate-400 transition ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && !disabled && (
        <div className="border-t border-slate-100 px-6 pb-6">
          {category === EmissionCategory.PurchasedEnergy && (
            <div className="my-4 flex gap-3 rounded-xl border border-cyan-100 bg-cyan-50 p-4 text-cyan-900">
              <IconInfo className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <strong className="text-sm">Scope 2 이중 보고</strong>
                <p className="mt-1 text-sm leading-6">
                  Location-based와 Market-based 결과를 함께 관리합니다. 현재 1차 포팅에서는 웹앱과 같은 월별 사용량 입력을 우선 맞추고,
                  PPA/REC 등 세부 계약수단 입력은 기존 데스크탑 상세 입력을 다음 단계에서 카드 내부로 통합합니다.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-4 py-4">
            {sources.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                <p className="text-sm font-semibold text-slate-600">등록된 배출원이 없습니다.</p>
                <p className="mt-1 text-xs text-slate-400">아래 버튼으로 {label} 배출원을 추가하세요.</p>
              </div>
            ) : (
              sources.map((source) => {
                const selectedFactor = factors.find((item) => item.name === source.fuelType);
                const unitOptions = getFactorUnitOptions(selectedFactor, source.unit);
                const sourceInventory = calculateScope12Inventory({ sources: [source], facilities, boundaryApproach });
                const formula = sourceInventory.sourceFormulas[source.id];
                const sourceResult = scope === "scope2" ? sourceInventory.scope2MarketTotal : sourceInventory.scope1Total;

                return (
                  <section key={source.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="grid gap-3 xl:grid-cols-[1.2fr_1fr_1fr_auto]">
                      <label className="grid gap-1.5 text-sm font-semibold text-slate-600">
                        배출원명
                        <input
                          value={source.description}
                          onChange={(event) => onUpdateSource(source.id, { description: event.target.value })}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-emerald-500"
                        />
                      </label>
                      <label className="grid gap-1.5 text-sm font-semibold text-slate-600">
                        시설
                        <select
                          value={source.facilityId}
                          onChange={(event) => onUpdateSource(source.id, { facilityId: event.target.value })}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-emerald-500"
                        >
                          {facilities.map((facility) => (
                            <option key={facility.id} value={facility.id}>
                              {facility.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-1.5 text-sm font-semibold text-slate-600">
                        배출계수
                        <select
                          value={source.fuelType}
                          onChange={(event) => onFuelTypeChange(source, event.target.value)}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-emerald-500"
                        >
                          {factors.map((factor) => (
                            <option key={factor.name} value={factor.name}>
                              {factor.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="button"
                        onClick={() => onRemoveSource(source.id)}
                        className="inline-flex items-center justify-center gap-2 self-end rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100"
                      >
                        <IconTrash className="h-4 w-4" />
                        삭제
                      </button>
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-[160px_1fr]">
                      <label className="grid gap-1.5 text-sm font-semibold text-slate-600">
                        단위
                        <select
                          value={source.unit}
                          onChange={(event) => onUpdateSource(source.id, { unit: event.target.value })}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-emerald-500"
                        >
                          {unitOptions.map((unit) => (
                            <option key={unit} value={unit}>
                              {unit}
                            </option>
                          ))}
                        </select>
                      </label>

                      <div>
                        <div className="mb-1.5 flex items-center justify-between">
                          <span className="text-sm font-semibold text-slate-600">{reportingYear} 월별 활동자료</span>
                          <span className="text-xs font-bold text-slate-500">
                            연간 합계 {getAnnualQuantity(source).toLocaleString("ko-KR")} {source.unit}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-6">
                          {monthLabels.map((month, index) => (
                            <label key={month} className="grid gap-1 text-xs font-semibold text-slate-500">
                              {month}
                              <input
                                type="number"
                                min="0"
                                value={source.monthlyQuantities[index] || 0}
                                onChange={(event) =>
                                  onUpdateSource(source.id, {
                                    monthlyQuantities: updateMonthlyValue(source, index, Number(event.target.value))
                                  })
                                }
                                className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm font-normal text-slate-900 outline-none focus:border-emerald-500"
                              />
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 rounded-xl bg-white p-4 md:grid-cols-[1fr_auto]">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Calculation formula</p>
                        <p className="mt-1 text-sm text-slate-600">{formula || "활동자료와 배출계수를 입력하면 산식이 표시됩니다."}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Result</p>
                        <strong className="mt-1 block text-lg text-slate-950">{formatKgCO2eAsTCO2e(sourceResult)}</strong>
                      </div>
                    </div>
                  </section>
                );
              })
            )}
          </div>

          <button
            type="button"
            onClick={onAddSource}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
          >
            <IconPlus className="h-4 w-4" />
            배출원 추가
          </button>
        </div>
      )}
    </article>
  );
}
