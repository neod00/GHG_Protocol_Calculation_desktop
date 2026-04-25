import {
  CO2eFactorFuel,
  BoundaryApproach,
  CalculationResult,
  EmissionCategory,
  EmissionSource,
  Facility,
  Refrigerant
} from "./types";
import {
  FUGITIVE_GASES,
  MOBILE_FUELS,
  PROCESS_MATERIALS,
  STATIONARY_FUELS,
  WASTE_SOURCES
} from "./constants/scope1";
import { SCOPE2_ENERGY_SOURCES, SCOPE2_FACTORS_BY_REGION } from "./constants/scope2";

export * from "./types";
export * from "./constants/scope1";
export * from "./constants/scope2";

export type Scope = "scope1" | "scope2";

export interface OrganizationBoundary {
  companyName: string;
  reportingYear: string;
  consolidationApproach: BoundaryApproach;
  facilities: Facility[];
}

export interface EmissionSourceResult extends EmissionSource {
  emissionsTCO2e: number;
  formula: string;
}

export interface Scope12FactorSet {
  stationary: CO2eFactorFuel[];
  mobile: CO2eFactorFuel[];
  process: CO2eFactorFuel[];
  fugitive: Refrigerant[];
  waste: CO2eFactorFuel[];
  scope2: CO2eFactorFuel[];
}

export interface Scope12InventoryResults {
  totalEmissionsMarket: number;
  totalEmissionsLocation: number;
  scope1Total: number;
  scope2LocationTotal: number;
  scope2MarketTotal: number;
  scope3Total: 0;
  facilityBreakdown: Record<string, CalculationResult>;
  sourceFormulas: Record<string, string>;
}

export const DEFAULT_SCOPE12_FACTORS: Scope12FactorSet = {
  stationary: STATIONARY_FUELS,
  mobile: MOBILE_FUELS,
  process: PROCESS_MATERIALS,
  fugitive: FUGITIVE_GASES,
  waste: WASTE_SOURCES,
  scope2: SCOPE2_ENERGY_SOURCES
};

export function getScopeForCategory(category: EmissionCategory): "scope1" | "scope2" | "scope3" {
  const scope1Categories = [
    EmissionCategory.StationaryCombustion,
    EmissionCategory.MobileCombustion,
    EmissionCategory.ProcessEmissions,
    EmissionCategory.FugitiveEmissions,
    EmissionCategory.Waste
  ];

  if (scope1Categories.includes(category)) return "scope1";
  if (category === EmissionCategory.PurchasedEnergy) return "scope2";
  return "scope3";
}

export function getFactorsForCategory(
  category: EmissionCategory,
  factors: Scope12FactorSet = DEFAULT_SCOPE12_FACTORS
): Array<CO2eFactorFuel | Refrigerant> {
  switch (category) {
    case EmissionCategory.StationaryCombustion:
      return factors.stationary;
    case EmissionCategory.MobileCombustion:
      return factors.mobile;
    case EmissionCategory.ProcessEmissions:
      return factors.process;
    case EmissionCategory.FugitiveEmissions:
      return factors.fugitive;
    case EmissionCategory.Waste:
      return factors.waste;
    case EmissionCategory.PurchasedEnergy:
      return factors.scope2;
    default:
      return [];
  }
}

export function generateCalculationFormula(
  fuel: CO2eFactorFuel | Refrigerant,
  totalQuantity: number,
  unit: string,
  resultKgCO2e: number
): string {
  if ("gwp" in fuel) {
    return `${totalQuantity.toLocaleString()} ${unit} x ${fuel.gwp} GWP = ${(resultKgCO2e / 1000).toFixed(4)} tCO2e`;
  }

  if (fuel.netHeatingValue && fuel.co2EF !== undefined) {
    const ch4 = fuel.ch4EF || 0;
    const n2o = fuel.n2oEF || 0;
    const gwpCH4 = fuel.gwpCH4 || 21;
    const gwpN2O = fuel.gwpN2O || 310;

    return `${totalQuantity.toLocaleString()} ${unit} x ${fuel.netHeatingValue} ${fuel.heatingValueUnit || "MJ"} x (${fuel.co2EF.toLocaleString()} + ${ch4}x${gwpCH4} + ${n2o}x${gwpN2O}) kg/TJ / 10^6 = ${(resultKgCO2e / 1000).toFixed(4)} tCO2e`;
  }

  const factor = fuel.factors[unit] || 0;
  return `${totalQuantity.toLocaleString()} ${unit} x ${factor.toFixed(4)} kgCO2e/${unit} = ${(resultKgCO2e / 1000).toFixed(4)} tCO2e`;
}

function sumQuantity(values: number[] | undefined): number {
  return values?.reduce((sum, value) => sum + value, 0) || 0;
}

function getTotalQuantity(source: EmissionSource): number {
  const monthlyTotal = sumQuantity(source.monthlyQuantities);
  if (!source.powerMix) return monthlyTotal;

  const mixTotal =
    sumQuantity(source.powerMix.ppa?.quantity) +
    sumQuantity(source.powerMix.rec?.quantity) +
    sumQuantity(source.powerMix.greenPremium?.quantity) +
    sumQuantity(source.powerMix.conventional?.quantity);

  return Math.max(monthlyTotal, mixTotal);
}

function getResidualMixFactor(unit: string, fallbackFactor: number): number {
  return SCOPE2_FACTORS_BY_REGION["South Korea"]?.factors[unit] || fallbackFactor;
}

export function calculateSourceEmissions(
  source: EmissionSource,
  factors: Scope12FactorSet = DEFAULT_SCOPE12_FACTORS
): CalculationResult {
  const scope = getScopeForCategory(source.category);

  if (scope === "scope3") {
    return { scope1: 0, scope2Location: 0, scope2Market: 0, scope3: 0 };
  }

  const totalQuantity = getTotalQuantity(source);
  const categoryFactors = getFactorsForCategory(source.category, factors);
  const fuel = categoryFactors.find((item) => item.name === source.fuelType);

  if (!fuel) {
    return { scope1: 0, scope2Location: 0, scope2Market: 0, scope3: 0 };
  }

  if ("gwp" in fuel) {
    const emissions = totalQuantity * fuel.gwp;
    return {
      scope1: emissions,
      scope2Location: 0,
      scope2Market: 0,
      scope3: 0,
      formula: generateCalculationFormula(fuel, totalQuantity, source.unit, emissions)
    };
  }

  let factor = fuel.factors[source.unit] || 0;

  if (factor === 0 && source.fuelType === "Grid Electricity") {
    factor = SCOPE2_FACTORS_BY_REGION["South Korea"].factors[source.unit] || 0;
  }

  const locationEmissions = totalQuantity * factor;

  if (scope === "scope1") {
    return {
      scope1: locationEmissions,
      scope2Location: 0,
      scope2Market: 0,
      scope3: 0,
      formula: generateCalculationFormula(fuel, totalQuantity, source.unit, locationEmissions)
    };
  }

  let marketEmissions = 0;

  if (source.powerMix) {
    const mix = source.powerMix;
    let allocatedQuantity = 0;

    if (mix.ppa) {
      const quantity = sumQuantity(mix.ppa.quantity);
      marketEmissions += quantity * (mix.ppa.factor || 0);
      allocatedQuantity += quantity;
    }

    if (mix.rec) {
      const quantity = sumQuantity(mix.rec.quantity);
      const meetsCriteria = mix.rec.meetsRequirements ?? true;
      marketEmissions += meetsCriteria ? 0 : quantity * getResidualMixFactor(source.unit, factor);
      allocatedQuantity += quantity;
    }

    if (mix.greenPremium) {
      const quantity = sumQuantity(mix.greenPremium.quantity);
      if (mix.greenPremium.treatAsRenewable) {
        const supplierFactor = mix.greenPremium.supplierFactorProvided ? mix.greenPremium.supplierFactor || 0 : 0;
        marketEmissions += quantity * supplierFactor;
      } else {
        marketEmissions += quantity * getResidualMixFactor(source.unit, factor);
      }
      allocatedQuantity += quantity;
    }

    if (mix.conventional) {
      const quantity = sumQuantity(mix.conventional.quantity);
      marketEmissions += quantity * (mix.conventional.factor || getResidualMixFactor(source.unit, factor));
      allocatedQuantity += quantity;
    }

    if (totalQuantity > allocatedQuantity) {
      marketEmissions += (totalQuantity - allocatedQuantity) * getResidualMixFactor(source.unit, factor);
    }
  } else {
    marketEmissions = totalQuantity * (source.marketBasedFactor ?? factor);
  }

  return {
    scope1: 0,
    scope2Location: locationEmissions,
    scope2Market: marketEmissions,
    scope3: 0,
    formula: generateCalculationFormula(fuel, totalQuantity, source.unit, locationEmissions)
  };
}

export function calculateScope12Inventory(params: {
  sources: EmissionSource[];
  facilities: Facility[];
  boundaryApproach: BoundaryApproach;
  factors?: Scope12FactorSet;
}): Scope12InventoryResults {
  const facilityBreakdown: Record<string, CalculationResult> = {};
  const sourceFormulas: Record<string, string> = {};
  let scope1Total = 0;
  let scope2LocationTotal = 0;
  let scope2MarketTotal = 0;

  params.facilities.forEach((facility) => {
    facilityBreakdown[facility.id] = { scope1: 0, scope2Location: 0, scope2Market: 0, scope3: 0 };
  });

  params.sources.forEach((source) => {
    const scope = getScopeForCategory(source.category);
    if (scope === "scope3") return;

    const facility = params.facilities.find((item) => item.id === source.facilityId);
    if (!facility) return;

    const ownershipFactor = params.boundaryApproach === "equity" ? facility.equityShare / 100 : 1;
    const emissions = calculateSourceEmissions(source, params.factors);

    if (emissions.formula) {
      sourceFormulas[source.id] = emissions.formula;
    }

    const adjustedScope1 = emissions.scope1 * ownershipFactor;
    const adjustedScope2Location = emissions.scope2Location * ownershipFactor;
    const adjustedScope2Market = emissions.scope2Market * ownershipFactor;

    scope1Total += adjustedScope1;
    scope2LocationTotal += adjustedScope2Location;
    scope2MarketTotal += adjustedScope2Market;

    facilityBreakdown[facility.id].scope1 += adjustedScope1;
    facilityBreakdown[facility.id].scope2Location += adjustedScope2Location;
    facilityBreakdown[facility.id].scope2Market += adjustedScope2Market;
  });

  return {
    totalEmissionsMarket: scope1Total + scope2MarketTotal,
    totalEmissionsLocation: scope1Total + scope2LocationTotal,
    scope1Total,
    scope2LocationTotal,
    scope2MarketTotal,
    scope3Total: 0,
    facilityBreakdown,
    sourceFormulas
  };
}

export function kgToTCO2e(value: number): number {
  return value / 1000;
}

export function formatKgCO2eAsTCO2e(value: number): string {
  return `${kgToTCO2e(value).toLocaleString(undefined, { maximumFractionDigits: 4 })} tCO2e`;
}
