import { CO2eFactorFuel } from '../types';

// ============================================================================
// GHG_EmissionFactor.csv 기반 Scope 2 배출계수 (온실가스 배출권거래제 지침 2024)
// ============================================================================
// 전력: 직접 배출량 + CH4/N2O 당량 포함
// 스팀: 열전용/열병합 구분, 가스별 계수 포함
// 미국: eGRID 기반 지역별 전력 배출계수
// ============================================================================

// Regional electricity grid emission factors (kg CO2e) - These are LOCATION-BASED factors
export const SCOPE2_FACTORS_BY_REGION: { [key: string]: { factors: { [key: string]: number }; source: string; sourceUrl: string; translationKey: string; co2EF?: number; ch4EF?: number; n2oEF?: number; isVerified?: boolean; csvLineRef?: string; } } = {
  'South Korea': {
    factors: { 'kWh': 0.4594, 'MWh': 459.4 },
    co2EF: 0.4567,
    ch4EF: 0.0036,
    n2oEF: 0.0085,
    isVerified: true,
    csvLineRef: 'GHG_EmissionFactor.csv:51',
    source: '온실가스 종합정보센터 (2024)',
    sourceUrl: 'https://www.gir.go.kr/',
    translationKey: 'countrySouthKorea'
  },
  'USA - National Average': {
    factors: { 'kWh': 0.407, 'MWh': 407 },
    co2EF: 0.405,
    ch4EF: 0.000029,
    n2oEF: 0.0000041,
    isVerified: true,
    csvLineRef: 'GHG_EmissionFactor.csv:USA-eGRID',
    source: 'EPA eGRID (2024)',
    sourceUrl: 'https://www.epa.gov/egrid',
    translationKey: 'countryUSA'
  },
  'USA - Montgomery': {
    factors: { 'kWh': 0.407, 'MWh': 407 },
    co2EF: 0.405,
    ch4EF: 0.000029,
    n2oEF: 0.0000041,
    isVerified: true,
    csvLineRef: 'GHG_EmissionFactor.csv:53',
    source: 'EPA eGRID (2024) - Montgomery',
    sourceUrl: 'https://www.epa.gov/egrid',
    translationKey: 'countryUSAMontgomery'
  },
  'USA - Georgia': {
    factors: { 'kWh': 0.407, 'MWh': 407 },
    co2EF: 0.405,
    ch4EF: 0.000029,
    n2oEF: 0.0000041,
    isVerified: true,
    csvLineRef: 'GHG_EmissionFactor.csv:54',
    source: 'EPA eGRID (2024) - Georgia',
    sourceUrl: 'https://www.epa.gov/egrid',
    translationKey: 'countryUSAGeorgia'
  },
  'USA - Alabama': {
    factors: { 'kWh': 0.407, 'MWh': 407 },
    co2EF: 0.405,
    ch4EF: 0.000029,
    n2oEF: 0.0000041,
    isVerified: true,
    csvLineRef: 'GHG_EmissionFactor.csv:55',
    source: 'EPA eGRID (2024) - Alabama',
    sourceUrl: 'https://www.epa.gov/egrid',
    translationKey: 'countryUSAAlabama'
  },
  'Japan': {
    factors: { 'kWh': 0.46, 'MWh': 460 },
    isVerified: false,
    source: 'IEA (2023 Data)',
    sourceUrl: 'https://www.iea.org/countries/japan/data-and-statistics',
    translationKey: 'countryJapan'
  },
  'EU': {
    factors: { 'kWh': 0.25, 'MWh': 250 },
    isVerified: false,
    source: 'IEA (2023 Data)',
    sourceUrl: 'https://www.iea.org/countries/european-union/data-and-statistics',
    translationKey: 'countryEU'
  },
};

// Default factors for Scope 2 Purchased Energy sources
export const SCOPE2_ENERGY_SOURCES: CO2eFactorFuel[] = [
  {
    name: 'Grid Electricity',
    translationKey: 'gridElectricity',
    units: ['kWh', 'MWh'],
    factors: { 'kWh': 0.4594, 'MWh': 459.4 },
    co2EF: 0.4567,
    ch4EF: 0.0036,
    n2oEF: 0.0085,
    gwpCH4: 21,
    gwpN2O: 310,
    isVerified: true,
    csvLineRef: 'GHG_EmissionFactor.csv:51',
    source: '온실가스 종합정보센터 (2024)',
    sourceUrl: 'https://www.gir.go.kr/',
  },
  {
    name: 'Purchased Steam (Heat Only)',
    translationKey: 'purchasedSteam',
    units: ['TJ', 'MJ'],
    factors: { 'TJ': 56452, 'MJ': 0.05645 },
    co2EF: 56373,
    ch4EF: 1.278,
    n2oEF: 0.166,
    gwpCH4: 21,
    gwpN2O: 310,
    isVerified: true,
    csvLineRef: 'GHG_EmissionFactor.csv:52',
    source: '온실가스 배출권거래제 지침 - 외부 열 (Heat Only)'
  },
  {
    name: 'Purchased Steam (CHP)',
    translationKey: 'purchasedSteamCHP',
    units: ['TJ', 'MJ'],
    factors: { 'TJ': 60974, 'MJ': 0.06097 },
    co2EF: 60760,
    ch4EF: 2.053,
    n2oEF: 0.549,
    gwpCH4: 21,
    gwpN2O: 310,
    isVerified: true,
    csvLineRef: 'GHG_EmissionFactor.csv:53',
    source: '온실가스 배출권거래제 지침 - 외부 열 (CHP)'
  },
  {
    name: 'Purchased Heating',
    translationKey: 'purchasedHeating',
    units: ['MWh', 'MMBtu'],
    factors: { 'MWh': 200, 'MMBtu': 58.6 },
    isVerified: false,
    source: 'Default estimate - District Heating',
  },
  {
    name: 'Purchased Cooling',
    translationKey: 'purchasedCooling',
    units: ['MWh', 'ton-hour'],
    factors: { 'MWh': 70, 'ton-hour': 0.06 },
    isVerified: false,
    source: 'Default estimate - District Cooling',
  },
];
