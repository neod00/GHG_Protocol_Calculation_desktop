export type Scope = "scope1" | "scope2";

export interface OrganizationBoundary {
  companyName: string;
  reportingYear: string;
  consolidationApproach: "operational" | "financial" | "equity";
  facilities: Facility[];
}

export interface Facility {
  id: string;
  name: string;
  group?: string;
  equityShare?: number;
}

export interface EmissionSourceInput {
  id: string;
  scope: Scope;
  facilityId: string;
  sourceName: string;
  activityType: string;
  quantity: number;
  unit: string;
  emissionFactorKgCO2e: number;
  emissionFactorSource: string;
}

export interface EmissionSourceResult extends EmissionSourceInput {
  emissionsTCO2e: number;
  formula: string;
}

export function calculateEmissionSource(input: EmissionSourceInput): EmissionSourceResult {
  const emissionsTCO2e = (input.quantity * input.emissionFactorKgCO2e) / 1000;
  return {
    ...input,
    emissionsTCO2e,
    formula: `${input.quantity.toLocaleString()} ${input.unit} x ${input.emissionFactorKgCO2e} kgCO2e/${input.unit} / 1000 = ${emissionsTCO2e.toFixed(4)} tCO2e`
  };
}

export function sumEmissions(results: EmissionSourceResult[], scope?: Scope): number {
  return results
    .filter((result) => !scope || result.scope === scope)
    .reduce((total, result) => total + result.emissionsTCO2e, 0);
}
