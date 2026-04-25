
// Fix: Define and export interfaces and enums for use throughout the application.
// This resolves circular dependency and missing type export errors.

export interface Refrigerant {
  id?: string;
  name: string;
  translationKey?: string;
  gwp: number;
  isCustom?: boolean;
  source?: string;
  sourceUrl?: string;
}

// Represents a simple CO2e factor, used for all combustion, process, waste, and Scope 2 sources.
export interface CO2eFactorFuel {
  id?: string;
  name: string;
  translationKey?: string;
  units: string[];
  factors: { [key: string]: number }; // kg CO2e / unit
  isCustom?: boolean;
  source?: string;
  sourceUrl?: string;
  // --- 상세 성분 필드 (GHG Protocol 투명성 강화) ---
  netHeatingValue?: number;         // 순발열량 (MJ/단위)
  heatingValueUnit?: string;        // 발열량 단위 (예: MJ/L, MJ/Nm³)
  co2EF?: number;                   // CO2 배출계수 (kg/TJ)
  ch4EF?: number;                   // CH4 배출계수 (kg/TJ)
  n2oEF?: number;                   // N2O 배출계수 (kg/TJ)
  gwpCH4?: number;                  // CH4 지구온난화지수 (기본: 21)
  gwpN2O?: number;                  // N2O 지구온난화지수 (기본: 310)
  isVerified?: boolean;             // CSV 기반 검증 데이터 여부
  csvLineRef?: string;              // CSV 출처 참조 (예: "GHG_EmissionFactor.csv:5")
  year?: number;                    // 데이터 기준 연도 (DQI 산정용)
  region?: string;                  // 적용 지역 (DQI 산정용)
}

// 산정 수식 결과를 위한 인터페이스
export interface CalculationResult {
  scope1: number;
  scope2Location: number;
  scope2Market: number;
  scope3: number;
  formula?: string;                 // 상세 산정 수식 문자열
  formulaComponents?: {             // 수식 구성 요소
    activityAmount: number;
    activityUnit: string;
    netHeatingValue?: number;
    co2EF?: number;
    ch4EF?: number;
    n2oEF?: number;
    gwpCH4?: number;
    gwpN2O?: number;
  };
}

export interface EditableCO2eFactorFuel extends CO2eFactorFuel { }
export interface EditableRefrigerant extends Refrigerant { }

export enum EmissionCategory {
  // Scope 1
  StationaryCombustion = 'Stationary Combustion',
  MobileCombustion = 'Mobile Combustion',
  ProcessEmissions = 'Process Emissions',
  FugitiveEmissions = 'Fugitive Emissions',
  Waste = 'Waste', // This is Scope 1 on-site treatment

  // Scope 2
  PurchasedEnergy = 'Purchased Energy',

  // Scope 3
  PurchasedGoodsAndServices = 'Purchased Goods and Services',
  CapitalGoods = 'Capital Goods',
  FuelAndEnergyRelatedActivities = 'Fuel- and Energy-Related Activities',
  UpstreamTransportationAndDistribution = 'Upstream Transportation and Distribution',
  WasteGeneratedInOperations = 'Waste Generated in Operations',
  BusinessTravel = 'Business Travel',
  EmployeeCommuting = 'Employee Commuting',
  UpstreamLeasedAssets = 'Upstream Leased Assets',
  DownstreamTransportationAndDistribution = 'Downstream Transportation and Distribution',
  ProcessingOfSoldProducts = 'Processing of Sold Products',
  UseOfSoldProducts = 'Use of Sold Products',
  EndOfLifeTreatmentOfSoldProducts = 'End-of-Life Treatment of Sold Products',
  DownstreamLeasedAssets = 'Downstream Leased Assets',
  Franchises = 'Franchises',
  Investments = 'Investments',
}


export type BoundaryApproach = 'operational' | 'financial' | 'equity';

export interface Facility {
  id: string;
  name: string;
  equityShare: number; // Stored as a percentage, e.g., 80 for 80%
  group?: string; // New optional field for grouping, e.g., "Headquarters", "Gumi Plant"
  isCorporate?: boolean; // New field to identify the special corporate-level facility
}

export type CalculationMethod = 'supplier_co2e' | 'activity' | 'spend' | 'hybrid';
export type Cat4CalculationMethod = 'activity' | 'fuel' | 'spend' | 'supplier_specific' | 'site_specific' | 'average';
export type Cat5CalculationMethod = 'activity' | 'supplier_specific' | 'spend' | 'average';
export type Cat6CalculationMethod = 'activity' | 'fuel' | 'spend' | 'supplier_specific';
export type Cat7CalculationMethod = 'activity' | 'average' | 'spend';
export type Cat8CalculationMethod = 'asset_specific' | 'area_based' | 'spend_based' | 'supplier_specific';
export type Cat10CalculationMethod = 'process_specific' | 'customer_specific' | 'spend';
export type Cat11CalculationMethod = 'energy_consumption' | 'fuel_consumption' | 'ghg_data';
export type Cat12CalculationMethod = 'waste_stream' | 'units_sold' | 'spend';
export type Cat14CalculationMethod = 'franchise_specific' | 'area_based' | 'average_data';
export type Cat15CalculationMethod = 'investment_specific' | 'average_data';

export type LeasedAssetType = 'Building' | 'Vehicle' | 'Equipment';
export type BuildingType = 'Office' | 'Warehouse' | 'Factory' | 'Retail' | 'DataCenter';
export type BusinessTravelMode = 'Air' | 'Rail' | 'Bus' | 'RentalCar' | 'PersonalCar' | 'Hotel';
export type FlightClass = 'Economy' | 'Business' | 'First';
export type TripType = 'one-way' | 'round-trip';
export type TransportMode = 'Road' | 'Sea' | 'Air' | 'Rail';
export type WasteType = 'MSW' | 'Paper' | 'Plastics' | 'Food' | 'Metal' | 'Hazardous' | 'Wood' | 'Glass' | 'Concrete' | 'Textile' | 'Industrial' | 'Construction' | 'Wastewater' | 'Sludge';
export type TreatmentMethod = 'Landfill' | 'Incineration' | 'Recycling' | 'Composting' | 'AnaerobicDigestion' | 'WastewaterTreatment';
export type EmployeeCommutingMode = 'PersonalCar' | 'PublicTransport' | 'Motorbike' | 'Carpool' | 'BicycleWalking';
export type PersonalCarType = 'Gasoline' | 'Diesel' | 'Hybrid' | 'Electric' | 'LPG';
export type PublicTransportType = 'Bus' | 'Subway';
export type FranchiseType = 'Restaurant' | 'Retail' | 'Service' | 'ConvenienceStore' | 'CoffeeShop';
export type InvestmentType = 'Equity' | 'Debt' | 'ProjectFinance' | 'RealEstate' | 'Other';
export type CapitalGoodsType = 'Building' | 'Vehicle' | 'ManufacturingEquipment' | 'ITEquipment' | 'OfficeEquipment' | 'Software' | 'IntangibleAssets' | 'Infrastructure' | 'AssetsUnderConstruction' | 'Other';

// Category 1 Factor Types for UI grouping
export type Category1FactorType =
  | 'rawMaterials_metals'
  | 'rawMaterials_plastics'
  | 'rawMaterials_chemicals'
  | 'rawMaterials_construction'
  | 'packaging'
  | 'electronics'
  | 'officeSupplies'
  | 'ppeSafety'
  | 'services'
  | 'foodAgricultural'
  | 'textiles'
  | 'custom';

// Data Quality Indicator (DQI) for GHG Protocol compliance
// Each dimension scored 1-5 (1=Very Good, 5=Very Poor)
export interface DataQualityIndicator {
  technologicalRep: 1 | 2 | 3 | 4 | 5;  // How well data reflects actual technology/process
  temporalRep: 1 | 2 | 3 | 4 | 5;       // How recent the data is (1=same year, 5=>10 years old)
  geographicalRep: 1 | 2 | 3 | 4 | 5;   // How well data reflects geographic conditions
  completeness: 1 | 2 | 3 | 4 | 5;      // Extent of upstream activities covered
  reliability: 1 | 2 | 3 | 4 | 5;       // Verification status (1=3rd party verified, 5=estimate)
}

// Helper function to calculate weighted DQI score
export const calculateDQIScore = (dqi: DataQualityIndicator): number => {
  const weights = {
    technologicalRep: 0.25,
    temporalRep: 0.20,
    geographicalRep: 0.20,
    completeness: 0.20,
    reliability: 0.15,
  };

  const weightedSum =
    dqi.technologicalRep * weights.technologicalRep +
    dqi.temporalRep * weights.temporalRep +
    dqi.geographicalRep * weights.geographicalRep +
    dqi.completeness * weights.completeness +
    dqi.reliability * weights.reliability;

  return Math.round(weightedSum * 100) / 100;
};

// Get quality rating from DQI score
export const getDQIRating = (score: number): 'high' | 'medium' | 'low' | 'estimated' => {
  if (score <= 1.5) return 'high';
  if (score <= 2.5) return 'medium';
  if (score <= 3.5) return 'low';
  return 'estimated';
};

// ============================================================================
// Hybrid Method Types for Category 1
// ============================================================================

// Input material for hybrid method
export interface HybridMaterialInput {
  id: string;
  materialName: string;           // 물질명 (from database or custom)
  quantity: number;               // 투입량
  unit: string;                   // 단위 (kg, tonnes, etc.)
  emissionFactor: number;         // Cradle-to-Gate 배출계수 (kgCO₂e/unit)
  factorSource?: string;          // 배출계수 출처
}

// Transport for hybrid method
export interface HybridTransportInput {
  id: string;
  description?: string;           // 설명 (선택)
  transportMode: TransportMode;   // 운송 수단
  vehicleType?: string;           // 차량 유형
  weightTonnes: number;           // 운송량 (tonnes)
  distanceKm: number;             // 운송 거리 (km)
  emissionFactor?: number;        // 배출계수 (kgCO₂e/tonne-km) - 선택, 없으면 기본값
}

// Waste for hybrid method
export interface HybridWasteInput {
  id: string;
  wasteType: WasteType;           // 폐기물 종류
  treatmentMethod: TreatmentMethod; // 처리 방법
  quantity: number;               // 폐기량
  unit: string;                   // 단위 (kg, tonnes)
  emissionFactor?: number;        // 배출계수 - 선택, 없으면 기본값
}

// Complete hybrid calculation data
export interface HybridCalculationData {
  // 1. 공급업체 Scope 1, 2 할당 배출량
  supplierScope12?: {
    totalEmissions: number;       // 공급업체의 총 Scope 1,2 배출량 (kgCO₂e)
    allocationBasis: 'revenue' | 'quantity' | 'custom'; // 할당 기준
    allocationPercentage: number; // 할당 비율 (%)
  };

  // 2. 투입 물질별 배출량
  materialInputs: HybridMaterialInput[];

  // 3. 운송 배출량
  transportInputs: HybridTransportInput[];

  // 4. 폐기물 처리 배출량
  wasteInputs: HybridWasteInput[];
}

export interface EmissionSource {
  id: string;
  facilityId: string;
  description: string; // User-provided name/description for the specific emission source (e.g., "Main Boiler #1", "Delivery Truck A"). Not used for Category 1.
  category: EmissionCategory;
  fuelType: string; // For most categories, this is the fuel/gas/material from a predefined list. For Cat 1, this is used for the item description. For Cat 5, it's used for spend-based service type.
  monthlyQuantities: number[];
  unit: string;
  marketBasedFactor?: number;

  // Scope 2 혼합 전력 사용 상세 정보 (PPA/REC/녹색프리미엄/일반전력)
  powerMix?: {
    // PPA 전력
    ppa?: {
      quantity: number[]; // 월별 사용량
      factor: number; // PPA 배출계수
      contractId?: string;
      supplierName?: string;
      verificationStatus?: 'verified' | 'pending' | 'not-verified';
    };

    // REC 전력
    rec?: {
      quantity: number[]; // 월별 사용량
      factor: number; // REC 배출계수 (일반적으로 0, 요건 충족 시)
      certificateId?: string;
      issuer?: string;
      verificationStatus?: 'verified' | 'pending' | 'not-verified';
      meetsRequirements?: boolean; // GHG Protocol 요건 충족 여부
      generationMatch?: boolean; // 발전 일치성
      certificationMatch?: boolean; // 인증 일치성
      ownershipMatch?: boolean; // 소유권 일치성
      periodMatch?: boolean; // 사용기간 일치성
    };

    // 녹색프리미엄 (Green Tariff) - 한국 특화
    greenPremium?: {
      quantity: number[]; // 월별 사용량
      factor: number; // 배출계수
      supplierName?: string;
      contractId?: string;
      treatAsRenewable?: boolean; // 재생에너지 계약수단으로 간주 여부 (사용자 선택)
      supplierFactorProvided?: boolean; // 공급사 배출계수 제공 여부
      supplierFactor?: number; // 공급사 제공 배출계수
      verificationStatus?: 'verified' | 'pending' | 'not-verified';
    };

    // 일반 전력 (나머지)
    conventional?: {
      quantity: number[]; // 월별 사용량
      factor: number; // 잔여 전력(residual mix) 또는 공급자 배출계수
      source: 'residual-mix' | 'supplier-specific' | 'national-average';
      supplierName?: string;
    };
  };

  // New fields for advanced Scope 3 calculation
  calculationMethod?: CalculationMethod | Cat4CalculationMethod | Cat5CalculationMethod | Cat6CalculationMethod | Cat7CalculationMethod | Cat8CalculationMethod | Cat10CalculationMethod | Cat11CalculationMethod | Cat12CalculationMethod | Cat14CalculationMethod | Cat15CalculationMethod;
  supplierProvidedCO2e?: number; // Total annual kg CO2e from supplier
  factor?: number; // kg CO2e per unit
  factorUnit?: string; // e.g., kg CO2e / KRW, kg CO2e / tonne
  factorSource?: string; // e.g., "DEFRA 2023", "Supplier EPD"
  aiAnalysis?: { // To store results from Gemini analysis
    suggestedCategory?: string;
    justification?: string;
  }
  dataQualityRating?: 'high' | 'medium' | 'low' | 'estimated';
  dataQualityIndicator?: DataQualityIndicator; // Detailed DQI for GHG Protocol compliance
  assumptions?: string;
  activityDataSource?: string; // e.g., "Monthly electricity bills", "Fuel purchase records"

  // Category 1 specific fields
  cat1FactorType?: Category1FactorType; // Selected factor category for UI
  selectedFactorName?: string; // Name of selected factor from database
  isFactorFromDatabase?: boolean; // Whether factor was selected from DB or manually entered
  hybridData?: HybridCalculationData; // Data for hybrid calculation method

  // New fields for advanced Scope 3 Category 3 calculation
  activityType?: 'fuel_wtt' | 'energy_upstream' | 'spend_based';
  isAutoGenerated?: boolean;

  // New fields for advanced Scope 3 Category 4 & 9 calculation
  transportMode?: TransportMode;
  vehicleType?: string;
  distanceKm?: number;
  weightTonnes?: number;
  refrigerated?: boolean;
  loadFactor?: number; // Percentage 0-100
  emptyBackhaul?: boolean;
  origin?: string;
  destination?: string;

  // New fields for advanced Scope 3 Category 5 calculation
  wasteType?: WasteType;
  treatmentMethod?: TreatmentMethod;
  includeTransport?: boolean;
  treatmentRatios?: { landfill: number; incineration: number; recycling: number }; // For average method

  // New fields for advanced Scope 3 Category 6 calculation
  businessTravelMode?: BusinessTravelMode;
  flightClass?: FlightClass;
  tripType?: TripType;
  passengers?: number;
  nights?: number; // for hotels
  fuelConsumptionLiters?: number; // for fuel-based car travel calculation
  vehicleCount?: number; // number of vehicles used (for car travel)

  // New fields for advanced Scope 3 Category 7 calculation
  commutingMode?: EmployeeCommutingMode;
  personalCarType?: PersonalCarType;
  publicTransportType?: PublicTransportType;
  daysPerYear?: number;
  carpoolOccupancy?: number;
  // For 'average' method in Cat 7
  totalEmployees?: number;
  percentTeleworking?: number;
  modeDistribution?: { [key: string]: number };

  // New fields for advanced Scope 3 Category 8 calculation
  leasedAssetType?: LeasedAssetType;
  buildingType?: BuildingType;
  areaSqm?: number;
  leaseDurationMonths?: number;
  // For asset_specific method, array of { type: string (fuel/energy name), value: number, unit: string }
  energyInputs?: { id: string; type: string; value: number; unit: string }[];

  // New fields for advanced Scope 3 Category 9 calculation
  downstreamActivityType?: 'transportation' | 'warehousing';

  // New fields for advanced Scope 3 Category 10 calculation
  processingMethod?: string;
  supplierDataType?: 'total_co2e' | 'energy_data';

  // New fields for advanced Scope 3 Category 11 calculation
  productLifetime?: number; // Years
  annualEnergyConsumption?: number; // value per unit per year
  energyRegion?: string; // For grid electricity

  // New fields for advanced Scope 3 Category 12 calculation
  disposalRatios?: { landfill: number; incineration: number; recycling: number }; // Percentages (0-100)
  soldProductWeight?: number; // kg per unit

  // New fields for advanced Scope 3 Category 14 calculation
  franchiseType?: FranchiseType;

  // New fields for advanced Scope 3 Category 15 calculation
  investmentType?: InvestmentType;
  investeeSector?: string;
  investmentValue?: number; // Amount invested
  companyValue?: number; // EVIC or Total Project Cost (for Equity and Project Finance)
  totalDebt?: number; // Total Debt (for Debt investments)
  loanOutstanding?: number; // Loan Outstanding (for Debt investments)

  // New fields for advanced Scope 3 Category 2 calculation
  capitalGoodsType?: CapitalGoodsType;
  acquisitionYear?: string; // Year of acquisition for capital goods
}