import { useState } from "react";
import { CO2eFactorFuel, Refrigerant, Scope12FactorSet } from "@ghg/core";

type FactorCategoryKey = keyof Scope12FactorSet;

const categoryTabs: Array<{ key: FactorCategoryKey; label: string; description: string }> = [
  { key: "stationary", label: "고정연소", description: "보일러, 설비, 고정 연소원 연료 계수" },
  { key: "mobile", label: "이동연소", description: "차량과 이동 장비 연료 계수" },
  { key: "process", label: "공정배출", description: "석회, 탄산염, 금속 등 공정 원료 계수" },
  { key: "fugitive", label: "누출배출", description: "냉매와 SF6 등 GWP 계수" },
  { key: "waste", label: "폐기물", description: "현장 폐기물 처리 배출계수" },
  { key: "scope2", label: "Scope 2", description: "구매 전력, 열, 스팀, 냉방 계수" }
];

interface DesktopFactorManagerProps {
  factorSet: Scope12FactorSet;
  disabled?: boolean;
  onChange: (next: Scope12FactorSet) => void;
  onReset: () => void;
}

function isRefrigerant(item: CO2eFactorFuel | Refrigerant): item is Refrigerant {
  return "gwp" in item;
}

function cloneFactorSet(factorSet: Scope12FactorSet): Scope12FactorSet {
  return {
    stationary: factorSet.stationary.map((item) => ({ ...item, factors: { ...item.factors }, units: [...item.units] })),
    mobile: factorSet.mobile.map((item) => ({ ...item, factors: { ...item.factors }, units: [...item.units] })),
    process: factorSet.process.map((item) => ({ ...item, factors: { ...item.factors }, units: [...item.units] })),
    fugitive: factorSet.fugitive.map((item) => ({ ...item })),
    waste: factorSet.waste.map((item) => ({ ...item, factors: { ...item.factors }, units: [...item.units] })),
    scope2: factorSet.scope2.map((item) => ({ ...item, factors: { ...item.factors }, units: [...item.units] }))
  };
}

export function DesktopFactorManager({ factorSet, disabled, onChange, onReset }: DesktopFactorManagerProps) {
  const activeCategory = categoryTabs.find((tab) => factorSet[tab.key])?.key || "stationary";
  const [selectedCategory, setSelectedCategory] = useSelectedCategory(activeCategory);
  const currentTab = categoryTabs.find((tab) => tab.key === selectedCategory) || categoryTabs[0];
  const factors = factorSet[selectedCategory] as Array<CO2eFactorFuel | Refrigerant>;

  function updateFactor(index: number, updater: (item: CO2eFactorFuel | Refrigerant) => CO2eFactorFuel | Refrigerant) {
    const next = cloneFactorSet(factorSet);
    const list = next[selectedCategory] as Array<CO2eFactorFuel | Refrigerant>;
    list[index] = updater(list[index]);
    onChange(next);
  }

  function updateFuelFactor(index: number, unit: string, value: string) {
    const parsed = Number.parseFloat(value);
    updateFactor(index, (item) => {
      if (isRefrigerant(item)) return item;
      return {
        ...item,
        factors: {
          ...item.factors,
          [unit]: Number.isFinite(parsed) ? parsed : 0
        },
        isCustom: true
      };
    });
  }

  function updateFactorName(index: number, value: string) {
    updateFactor(index, (item) => ({ ...item, name: value, isCustom: item.isCustom || true }));
  }

  function updateFactorSource(index: number, value: string) {
    updateFactor(index, (item) => ({ ...item, source: value, isCustom: item.isCustom || true }));
  }

  function updateCustomUnits(index: number, value: string) {
    updateFactor(index, (item) => {
      if (isRefrigerant(item) || !item.isCustom) return item;
      const units = value.split(",").map((unit) => unit.trim()).filter(Boolean);
      const nextUnits = units.length > 0 ? units : ["unit"];
      const nextFactors = Object.fromEntries(nextUnits.map((unit) => [unit, item.factors[unit] ?? 0]));
      return {
        ...item,
        units: nextUnits,
        factors: nextFactors,
        isCustom: true
      };
    });
  }

  function updateGwp(index: number, value: string) {
    const parsed = Number.parseFloat(value);
    updateFactor(index, (item) => {
      if (!isRefrigerant(item)) return item;
      return {
        ...item,
        gwp: Number.isFinite(parsed) ? parsed : 0,
        isCustom: true
      };
    });
  }

  function addCustomFactor() {
    const next = cloneFactorSet(factorSet);
    const list = next[selectedCategory] as Array<CO2eFactorFuel | Refrigerant>;
    const name = `Custom ${currentTab.label} Factor ${list.length + 1}`;

    if (selectedCategory === "fugitive") {
      list.push({ name, gwp: 1, isCustom: true, source: "사용자 입력" });
    } else {
      list.push({
        name,
        units: ["unit"],
        factors: { unit: 0 },
        isCustom: true,
        source: "사용자 입력"
      });
    }

    onChange(next);
  }

  function removeCustomFactor(index: number) {
    const item = factors[index];
    if (!item?.isCustom) return;

    const next = cloneFactorSet(factorSet);
    const list = next[selectedCategory] as Array<CO2eFactorFuel | Refrigerant>;
    list.splice(index, 1);
    onChange(next);
  }

  return (
    <section className={`factor-manager-panel ${disabled ? "locked-panel" : ""}`}>
      <div className="results-header">
        <div>
          <p className="eyebrow">Emission factors</p>
          <h2>Scope 1/2 배출계수 관리</h2>
          <p className="project-meta">
            표준 배출계수는 로컬 프로젝트에 저장되며 계산과 보고서에만 사용됩니다. 이 데이터는 라이선스 서버로 전송되지 않습니다.
          </p>
        </div>
        <div className="button-row">
          <button type="button" className="ghost-button" disabled={disabled} onClick={onReset}>
            기본값 복원
          </button>
          <button type="button" disabled={disabled} onClick={addCustomFactor}>
            사용자 계수 추가
          </button>
        </div>
      </div>

      {disabled && <p className="lock-copy">라이선스 인증 후 배출계수 편집 기능을 사용할 수 있습니다.</p>}

      <div className="factor-manager-layout">
        <div className="factor-tabs" role="tablist" aria-label="배출계수 범주">
          {categoryTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={tab.key === selectedCategory ? "active" : ""}
              disabled={disabled}
              onClick={() => setSelectedCategory(tab.key)}
            >
              <span>{tab.label}</span>
              <small>{factorSet[tab.key].length}개</small>
            </button>
          ))}
        </div>

        <div className="factor-list-panel">
          <div className="factor-list-header">
            <div>
              <h3>{currentTab.label}</h3>
              <p>{currentTab.description}</p>
            </div>
            <span>{factors.length.toLocaleString()} factors</span>
          </div>

          <div className="factor-list">
            {factors.map((factor, index) => (
              <article key={`${factor.name}-${index}`} className="factor-item-card">
                <div className="factor-item-heading">
                  <div>
                    {factor.isCustom ? (
                      <div className="factor-custom-fields">
                        <input
                          value={factor.name}
                          disabled={disabled}
                          aria-label="사용자 배출계수 이름"
                          onChange={(event) => updateFactorName(index, event.target.value)}
                        />
                        <input
                          value={factor.source || ""}
                          disabled={disabled}
                          aria-label="사용자 배출계수 출처"
                          placeholder="출처"
                          onChange={(event) => updateFactorSource(index, event.target.value)}
                        />
                      </div>
                    ) : (
                      <>
                        <strong>{factor.name}</strong>
                        <p>{factor.source || "출처 정보 없음"}</p>
                      </>
                    )}
                  </div>
                  {factor.isCustom && (
                    <button type="button" className="ghost-button" disabled={disabled} onClick={() => removeCustomFactor(index)}>
                      삭제
                    </button>
                  )}
                </div>

                {isRefrigerant(factor) ? (
                  <label className="factor-edit-row">
                    <span>GWP</span>
                    <input type="number" step="any" value={factor.gwp} disabled={disabled} onChange={(event) => updateGwp(index, event.target.value)} />
                  </label>
                ) : (
                  <>
                    {factor.isCustom && (
                      <label className="factor-edit-row factor-units-row">
                        <span>단위 목록</span>
                        <input
                          value={factor.units.join(", ")}
                          disabled={disabled}
                          placeholder="예: kWh, MWh"
                          onChange={(event) => updateCustomUnits(index, event.target.value)}
                        />
                      </label>
                    )}
                    <div className="factor-unit-grid">
                      {factor.units.map((unit) => (
                        <label key={unit} className="factor-edit-row">
                          <span>kgCO2e/{unit}</span>
                          <input
                            type="number"
                            step="any"
                            value={factor.factors[unit] ?? 0}
                            disabled={disabled}
                            onChange={(event) => updateFuelFactor(index, unit, event.target.value)}
                          />
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function useSelectedCategory(initialCategory: FactorCategoryKey) {
  return useState<FactorCategoryKey>(initialCategory);
}
