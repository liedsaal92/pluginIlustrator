export type CustomerSegment = 'vip' | 'normal';
export type Gender = 'H' | 'M';
export type ProductId = 'camiseta' | 'pantaloneta' | 'equipo' | 'por_cm';
export type PrintProfileId = string;
export type MeasurementSource = 'real' | 'estimated';

export interface PricingConfig {
  monthlyMeters: number;
  minMargin: number;
  minProfitRatio: number;
  wasteRate: number;
  rollWidthCm: number;
  roundingEnabled: boolean;
  roundingIncrement: number;
  pricePerCm: number;
  savingsTransferRateNormal: number;
  savingsTransferRateVip: number;
  defaultProfileId: string;
  tailoringCamiseta: number;
  tailoringPantaloneta: number;
  polinesCost: number;
}

export interface FabricType {
  id: string;
  name: string;
  costPerKg: number;
  metersPerKg: number;
  tubular: boolean;
}

export interface VolumeTier {
  id: string;
  from: number;
  to: number | null;
  discount: number;
}

export interface Supply {
  id: string;
  name: string;
  totalCost: number;
  quantity: number;
  unit: string;
  applyInkFactor: boolean;
}

export interface MachineCost {
  id: string;
  name: string;
  cost: number;
  lifeMeters: number;
}

export interface OperationCost {
  id: string;
  name: string;
  monthlyCost: number;
}

export interface PrintProfile {
  id: PrintProfileId;
  name: string;
  inkFactor: number;
  enabled: boolean;
}

export interface Product {
  id: ProductId;
  name: string;
  calculation: 'shirt_measurements' | 'shorts_estimate' | 'combo' | 'linear_cm';
  measurementSource: MeasurementSource;
}

export interface SizeMeasurement {
  size: number;
  torsoHeightCm: number;
  torsoWidthCm: number;
  sleeveWidthCm: number;
  sleeveHeightCm: number;
  shirtMeters: number;
  source: MeasurementSource;
}

export interface BasePrice {
  segment: CustomerSegment;
  gender: Gender;
  size: number;
  camiseta: number;
  pantaloneta: number;
  equipo: number;
}

export type BasePriceField = 'camiseta' | 'pantaloneta' | 'equipo';

export interface CostBreakdown {
  profileId: PrintProfileId;
  costPerMeter: number;
  normalCostPerMeter: number;
  metersUnit: number;
  printCostPerUnit: number;
  fabricCostPerUnit: number;
  tailoringCostPerUnit: number;
  polinesCostPerUnit: number;
  unitCost: number;
  totalCost: number;
  savingsPerUnit: number;
  measurementSource: MeasurementSource;
  notes: string[];
}

export interface QuoteInput {
  customerSegment: CustomerSegment;
  gender: Gender;
  productId: ProductId;
  size: number;
  quantity: number;
  profileId: PrintProfileId;
  profiles: PrintProfile[];
  basePrices: BasePrice[];
  supplies: Supply[];
  machines: MachineCost[];
  operations: OperationCost[];
  volumeTiers: VolumeTier[];
  linearCm?: number;
  manualPrice?: number;
  savingsTransferRate: number;
  config: PricingConfig;
  tallaDims?: { ALTO: string; ANCHO: string; MANGA_ANCHO: string; MANGA_ALTO: string };
  serviceMode?: 'sublimation' | 'full_service';
  fabrics?: FabricType[];
  selectedFabricIdCamiseta?: string | null;
  selectedFabricIdPantaloneta?: string | null;
}

export interface QuoteResult {
  input: QuoteInput;
  cost: CostBreakdown;
  basePrice: number;
  volumeDiscount: number;
  volumeDiscountAmount: number;
  minPriceByMargin: number;
  minPriceByProfit: number;
  minPrice: number;
  transferredSavings: number;
  retainedSavings: number;
  recommendedUnitPrice: number;
  finalUnitPrice: number;
  totalPrice: number;
  unitProfit: number;
  totalProfit: number;
  margin: number;
  alerts: string[];
}

export type MarketProductId = 'camiseta' | 'pantaloneta' | 'equipo' | 'por_cm';

export interface Competitor {
  id: string;
  name: string;
  prices: Partial<Record<MarketProductId, number>>;
}

export interface QuoteHistoryEntry extends QuoteResult {
  id: string;
  createdAt: string;
}

export interface TablaExportRow {
  size: number;
  gender: Gender;
  prices: Partial<Record<'camiseta' | 'pantaloneta' | 'equipo', number>>;
}

export interface TablaExportEntry {
  id: string;
  createdAt: string;
  clienteId: string | null;
  clienteNombre: string | null;
  segment: CustomerSegment;
  profileId: string;
  profileName: string;
  transferRate: number;
  roundingEnabled: boolean;
  roundingIncrement: number;
  rows: TablaExportRow[];
}
