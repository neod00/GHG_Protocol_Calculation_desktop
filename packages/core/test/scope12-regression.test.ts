import assert from "node:assert/strict";
import test from "node:test";
import {
  BoundaryApproach,
  calculateScope12Inventory,
  calculateSourceEmissions,
  EmissionCategory,
  EmissionSource,
  Facility
} from "../src/index";

const EPSILON = 0.000001;

function expectNear(actual: number, expected: number, message?: string) {
  assert.ok(Math.abs(actual - expected) < EPSILON, `${message ?? "value"}: expected ${expected}, received ${actual}`);
}

function makeMonthly(total: number): number[] {
  return Array.from({ length: 12 }, () => total / 12);
}

function source(overrides: Partial<EmissionSource>): EmissionSource {
  return {
    id: "source-1",
    facilityId: "facility-1",
    description: "Regression source",
    category: EmissionCategory.StationaryCombustion,
    fuelType: "City Gas (LNG)",
    monthlyQuantities: makeMonthly(1000),
    unit: "Nm3",
    ...overrides
  };
}

const facility: Facility = {
  id: "facility-1",
  name: "Main facility",
  equityShare: 50
};

test("stationary combustion uses Scope 1 fuel factor", () => {
  const result = calculateSourceEmissions(source({}));

  expectNear(result.scope1, 2184.74, "stationary scope1 kgCO2e");
  expectNear(result.scope2Location, 0);
  expectNear(result.scope2Market, 0);
});

test("mobile combustion uses mobile fuel factors, not stationary factors", () => {
  const result = calculateSourceEmissions(
    source({
      category: EmissionCategory.MobileCombustion,
      fuelType: "Diesel",
      monthlyQuantities: makeMonthly(500),
      unit: "liters"
    })
  );

  expectNear(result.scope1, 1326.915, "mobile diesel kgCO2e");
});

test("fugitive emissions use refrigerant GWP", () => {
  const result = calculateSourceEmissions(
    source({
      category: EmissionCategory.FugitiveEmissions,
      fuelType: "HFC-134a (Refrigerant)",
      monthlyQuantities: makeMonthly(10),
      unit: "kg"
    })
  );

  expectNear(result.scope1, 14300, "fugitive HFC-134a kgCO2e");
});

test("Scope 2 grid electricity returns location and default market totals", () => {
  const result = calculateSourceEmissions(
    source({
      category: EmissionCategory.PurchasedEnergy,
      fuelType: "Grid Electricity",
      monthlyQuantities: makeMonthly(12000),
      unit: "kWh"
    })
  );

  expectNear(result.scope1, 0);
  expectNear(result.scope2Location, 5512.8, "location-based electricity kgCO2e");
  expectNear(result.scope2Market, 5512.8, "default market-based electricity kgCO2e");
});

test("Scope 2 market-based power mix allocates PPA, REC, green premium, conventional, and residual quantities", () => {
  const result = calculateSourceEmissions(
    source({
      category: EmissionCategory.PurchasedEnergy,
      fuelType: "Grid Electricity",
      monthlyQuantities: makeMonthly(12000),
      unit: "kWh",
      powerMix: {
        ppa: {
          quantity: makeMonthly(3000),
          factor: 0.05,
          supplierName: "PPA supplier"
        },
        rec: {
          quantity: makeMonthly(2000),
          factor: 0,
          meetsRequirements: true
        },
        greenPremium: {
          quantity: makeMonthly(1000),
          factor: 0,
          treatAsRenewable: true,
          supplierFactorProvided: true,
          supplierFactor: 0.02
        },
        conventional: {
          quantity: makeMonthly(4000),
          factor: 0.4594,
          source: "national-average"
        }
      }
    })
  );

  expectNear(result.scope2Location, 5512.8, "location-based electricity kgCO2e");
  expectNear(result.scope2Market, 2926.4, "market-based electricity kgCO2e");
});

test("inventory applies equity boundary share to Scope 1 and Scope 2 totals", () => {
  const sources = [
    source({ id: "stationary" }),
    source({
      id: "electricity",
      category: EmissionCategory.PurchasedEnergy,
      fuelType: "Grid Electricity",
      monthlyQuantities: makeMonthly(12000),
      unit: "kWh"
    })
  ];

  const result = calculateScope12Inventory({
    sources,
    facilities: [facility],
    boundaryApproach: "equity" as BoundaryApproach
  });

  expectNear(result.scope1Total, 1092.37, "equity-adjusted Scope 1 kgCO2e");
  expectNear(result.scope2LocationTotal, 2756.4, "equity-adjusted Scope 2 location kgCO2e");
  expectNear(result.scope2MarketTotal, 2756.4, "equity-adjusted Scope 2 market kgCO2e");
  expectNear(result.totalEmissionsLocation, 3848.77, "equity-adjusted total location kgCO2e");
  expectNear(result.totalEmissionsMarket, 3848.77, "equity-adjusted total market kgCO2e");
});
