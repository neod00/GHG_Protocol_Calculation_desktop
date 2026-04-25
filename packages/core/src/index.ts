export interface Refrigerant {
  id?: string;
  name: string;
  translationKey?: string;
  gwp: number;
  isCustom?: boolean;
  source?: string;
  sourceUrl?: string;
}

export interface CO2eFactorFuel {
  id?: string;
  name: string;
  translationKey?: string;
  units: string[];
  factors: { [key: string]: number };
  isCustom?: boolean;
  source?: string;
  sourceUrl?: string;
  netHeatingValue?: number;
  heatingValueUnit?: string;
  co2EF?: number;
  ch4EF?: number;
  n2oEF?: number;
  gwpCH4?: number;
  gwpN2O?: number;
  isVerified?: boolean;
  csvLineRef?: string;
}

export interface OrganizationBoundary {
  companyName: string;
  reportingYear: string;
  consolidationApproach: BoundaryApproach;
  facilities: Facility[];
}

export enum EmissionCategory {
  StationaryCombustion = "Stationary Combustion",
  MobileCombustion = "Mobile Combustion",
  ProcessEmissions = "Process Emissions",
  FugitiveEmissions = "Fugitive Emissions",
  Waste = "Waste",
  PurchasedEnergy = "Purchased Energy"
}

export type Scope = "scope1" | "scope2";
export type BoundaryApproach = "operational" | "financial" | "equity";

export interface Facility {
  id: string;
  name: string;
  equityShare: number;
  group?: string;
  isCorporate?: boolean;
}

export interface Scope2PowerMix {
  ppa?: {
    quantity: number[];
    factor: number;
    contractId?: string;
    supplierName?: string;
    verificationStatus?: "verified" | "pending" | "not-verified";
  };
  rec?: {
    quantity: number[];
    factor: number;
    certificateId?: string;
    issuer?: string;
    verificationStatus?: "verified" | "pending" | "not-verified";
    meetsRequirements?: boolean;
  };
  greenPremium?: {
    quantity: number[];
    factor: number;
    supplierName?: string;
    contractId?: string;
    treatAsRenewable?: boolean;
    supplierFactorProvided?: boolean;
    supplierFactor?: number;
    verificationStatus?: "verified" | "pending" | "not-verified";
  };
  conventional?: {
    quantity: number[];
    factor: number;
    source: "residual-mix" | "supplier-specific" | "national-average";
    supplierName?: string;
  };
}

export interface EmissionSource {
  id: string;
  facilityId: string;
  description: string;
  category: EmissionCategory;
  fuelType: string;
  monthlyQuantities: number[];
  unit: string;
  marketBasedFactor?: number;
  powerMix?: Scope2PowerMix;
}

export interface CalculationResult {
  scope1: number;
  scope2Location: number;
  scope2Market: number;
  scope3: number;
  formula?: string;
}

export interface EmissionSourceResult extends EmissionSource {
  emissionsTCO2e: number;
  formula: string;
}

export interface InventoryResults {
  totalEmissionsMarket: number;
  totalEmissionsLocation: number;
  scope1Total: number;
  scope2LocationTotal: number;
  scope2MarketTotal: number;
  scope3Total: number;
  facilityBreakdown: Record<string, CalculationResult>;
  sourceFormulas: Record<string, string>;
}

export interface FactorSet {
  stationary: CO2eFactorFuel[];
  mobile: CO2eFactorFuel[];
  process: CO2eFactorFuel[];
  fugitive: Refrigerant[];
  waste: CO2eFactorFuel[];
  scope2: CO2eFactorFuel[];
}

export const STATIONARY_FUELS: CO2eFactorFuel[] = [
  {
    name: "City Gas (LNG)",
    translationKey: "naturalGas",
    units: ["Nm3", "MJ"],
    factors: { Nm3: 2.18474, MJ: 0.05617 },
    netHeatingValue: 38.9,
    heatingValueUnit: "MJ/Nm3",
    co2EF: 56100,
    ch4EF: 1,
    n2oEF: 0.1,
    gwpCH4: 21,
    gwpN2O: 310,
    isVerified: true,
    csvLineRef: "GHG_EmissionFactor.csv:5",
    source: "온실가스 배출권거래제 지침(2024)"
  },
  {
    name: "Diesel",
    translationKey: "diesel",
    units: ["liters", "gal"],
    factors: { liters: 2.61708, gal: 9.91874 },
    netHeatingValue: 35.2,
    heatingValueUnit: "MJ/L",
    co2EF: 74100,
    ch4EF: 3,
    n2oEF: 0.6,
    gwpCH4: 21,
    gwpN2O: 310,
    isVerified: true,
    csvLineRef: "GHG_EmissionFactor.csv:37",
    source: "온실가스 배출권거래제 지침(2024)"
  },
  {
    name: "Gasoline",
    translationKey: "gasoline",
    units: ["liters", "gal"],
    factors: { liters: 2.19807, gal: 8.33069 },
    netHeatingValue: 30.4,
    heatingValueUnit: "MJ/L",
    co2EF: 69300,
    ch4EF: 3,
    n2oEF: 0.6,
    gwpCH4: 21,
    gwpN2O: 310,
    isVerified: true,
    csvLineRef: "GHG_EmissionFactor.csv:36",
    source: "온실가스 배출권거래제 지침(2024)"
  }
];

export const MOBILE_FUELS: CO2eFactorFuel[] = [
  {
    name: "Gasoline (Petrol)",
    translationKey: "gasoline",
    units: ["liters", "gal"],
    factors: { liters: 2.19807, gal: 8.33069 },
    netHeatingValue: 30.4,
    heatingValueUnit: "MJ/L",
    co2EF: 69300,
    ch4EF: 25,
    n2oEF: 8,
    gwpCH4: 21,
    gwpN2O: 310,
    isVerified: true,
    source: "온실가스 배출권거래제 지침(2024)"
  },
  {
    name: "Diesel",
    translationKey: "diesel",
    units: ["liters", "gal"],
    factors: { liters: 2.65383, gal: 10.058 },
    netHeatingValue: 35.2,
    heatingValueUnit: "MJ/L",
    co2EF: 74100,
    ch4EF: 4,
    n2oEF: 3.9,
    gwpCH4: 21,
    gwpN2O: 310,
    isVerified: true,
    source: "온실가스 배출권거래제 지침(2024)"
  },
  {
    name: "LPG (Vehicle)",
    translationKey: "lpgVehicle",
    units: ["liters", "kg", "gal"],
    factors: { liters: 1.603, kg: 2.946, gal: 6.07537 },
    netHeatingValue: 45.7,
    heatingValueUnit: "MJ/kg",
    co2EF: 63100,
    ch4EF: 62,
    n2oEF: 0.2,
    gwpCH4: 21,
    gwpN2O: 310,
    isVerified: true,
    source: "온실가스 배출권거래제 지침(2024)"
  }
];

export const PROCESS_MATERIALS: CO2eFactorFuel[] = [
  {
    name: "Quicklime",
    translationKey: "quicklime",
    units: ["tonnes"],
    factors: { tonnes: 750 },
    co2EF: 750,
    isVerified: true,
    csvLineRef: "GHG_EmissionFactor.csv:66",
    source: "온실가스 배출권거래제 지침(2024)"
  },
  {
    name: "Limestone",
    translationKey: "limestone",
    units: ["tonnes"],
    factors: { tonnes: 440 },
    co2EF: 440,
    isVerified: true,
    csvLineRef: "GHG_EmissionFactor.csv:69",
    source: "온실가스 배출권거래제 지침(2024)"
  }
];

export const FUGITIVE_GASES: Refrigerant[] = [
  { name: "HFC-134a (Refrigerant)", translationKey: "hfc134a", gwp: 1430 },
  { name: "R-404A (Refrigerant)", translationKey: "r404a", gwp: 3922 },
  { name: "R-410A (Refrigerant)", translationKey: "r410a", gwp: 2088 },
  { name: "R-22 (HCFC-22, Refrigerant)", translationKey: "r22", gwp: 1810 },
  { name: "SF6 (from electrical equipment)", translationKey: "sf6", gwp: 23500 }
];

export const WASTE_SOURCES: CO2eFactorFuel[] = [
  {
    name: "Paper Waste",
    translationKey: "wasteHouseholdPaper",
    units: ["tonnes"],
    factors: { tonnes: 31.35 },
    co2EF: 15.17,
    ch4EF: 6.1,
    n2oEF: 52.1,
    gwpCH4: 21,
    gwpN2O: 310,
    isVerified: true,
    csvLineRef: "GHG_EmissionFactor.csv:115",
    source: "온실가스 배출권거래제 지침(2024)"
  },
  {
    name: "Plastic Waste - Household",
    translationKey: "wasteHouseholdPlastic",
    units: ["tonnes"],
    factors: { tonnes: 2764.28 },
    co2EF: 2748,
    ch4EF: 6.1,
    n2oEF: 52.1,
    gwpCH4: 21,
    gwpN2O: 310,
    isVerified: true,
    csvLineRef: "GHG_EmissionFactor.csv:122",
    source: "온실가스 배출권거래제 지침(2024)"
  }
];

export const SCOPE2_FACTORS_BY_REGION: Record<
  string,
  CO2eFactorFuel & { sourceUrl?: string }
> = {
  "South Korea": {
    name: "South Korea",
    translationKey: "countrySouthKorea",
    units: ["kWh", "MWh"],
    factors: { kWh: 0.4594, MWh: 459.4 },
    co2EF: 0.4567,
    ch4EF: 0.0036,
    n2oEF: 0.0085,
    isVerified: true,
    csvLineRef: "GHG_EmissionFactor.csv:51",
    source: "온실가스종합정보센터(2024)",
    sourceUrl: "https://www.gir.go.kr/"
  }
};

export const SCOPE2_ENERGY_SOURCES: CO2eFactorFuel[] = [
  {
    name: "Grid Electricity",
    translationKey: "gridElectricity",
    units: ["kWh", "MWh"],
    factors: { kWh: 0.4594, MWh: 459.4 },
    co2EF: 0.4567,
    ch4EF: 0.0036,
    n2oEF: 0.0085,
    gwpCH4: 21,
    gwpN2O: 310,
    isVerified: true,
    csvLineRef: "GHG_EmissionFactor.csv:51",
    source: "온실가스종합정보센터(2024)",
    sourceUrl: "https://www.gir.go.kr/"
  },
  {
    name: "Purchased Steam (Heat Only)",
    translationKey: "purchasedSteam",
    units: ["TJ", "MJ"],
    factors: { TJ: 56452, MJ: 0.05645 },
    co2EF: 56373,
    ch4EF: 1.278,
    n2oEF: 0.166,
    gwpCH4: 21,
    gwpN2O: 310,
    isVerified: true,
    csvLineRef: "GHG_EmissionFactor.csv:52",
    source: "온실가스 배출권거래제 지침(2024)"
  },
  {
    name: "Purchased Steam (CHP)",
    translationKey: "purchasedSteamCHP",
    units: ["TJ", "MJ"],
    factors: { TJ: 60974, MJ: 0.06097 },
    co2EF: 60760,
    ch4EF: 2.053,
    n2oEF: 0.549,
    gwpCH4: 21,
    gwpN2O: 310,
    isVerified: true,
    csvLineRef: "GHG_EmissionFactor.csv:53",
    source: "온실가스 배출권거래제 지침(2024)"
  }
];

export const DEFAULT_FACTORS: FactorSet = {
  stationary: STATIONARY_FUELS,
  mobile: MOBILE_FUELS,
  process: PROCESS_MATERIALS,
  fugitive: FUGITIVE_GASES,
  waste: WASTE_SOURCES,
  scope2: SCOPE2_ENERGY_SOURCES
};

export function getScopeForCategory(category: EmissionCategory): Scope {
  return category === EmissionCategory.PurchasedEnergy ? "scope2" : "scope1";
}

export function getFactorsForCategory(category: EmissionCategory, factors: FactorSet = DEFAULT_FACTORS): Array<CO2eFactorFuel | Refrigerant> {
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
  factors: FactorSet = DEFAULT_FACTORS
): CalculationResult {
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
  const scope = getScopeForCategory(source.category);

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

export function calculateInventory(params: {
  sources: EmissionSource[];
  facilities: Facility[];
  boundaryApproach: BoundaryApproach;
  factors?: FactorSet;
}): InventoryResults {
  const facilityBreakdown: Record<string, CalculationResult> = {};
  const sourceFormulas: Record<string, string> = {};
  let scope1Total = 0;
  let scope2LocationTotal = 0;
  let scope2MarketTotal = 0;

  params.facilities.forEach((facility) => {
    facilityBreakdown[facility.id] = { scope1: 0, scope2Location: 0, scope2Market: 0, scope3: 0 };
  });

  params.sources.forEach((source) => {
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
