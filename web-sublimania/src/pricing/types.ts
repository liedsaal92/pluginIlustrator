export type CustomerSegment = 'vip' | 'normal';
export type ProductId = 'camiseta' | 'pantaloneta' | 'equipo' | 'por_cm';
export type PrintProfileId = 'normal' | 'eco' | 'super_eco' | 'ultra_eco';
export type MeasurementSource = 'real' | 'estimated';

export interface PricingConfig {
  monthlyMeters: number;
  minMargin: number;
  minProfitRatio: number;
  wasteRate: number;
  rollWidthCm: number;
  roundingEnabled: boolean;
  roundingIncrement: number;
  comboDiscount: number;
  pricePerCm: number;
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
  unitCost: number;
  totalCost: number;
  savingsPerUnit: number;
  measurementSource: MeasurementSource;
  notes: string[];
}

export interface QuoteInput {
  customerSegment: CustomerSegment;
  productId: ProductId;
  size: number;
  quantity: number;
  profileId: PrintProfileId;
  basePrices: BasePrice[];
  supplies: Supply[];
  machines: MachineCost[];
  operations: OperationCost[];
  linearCm?: number;
  manualPrice?: number;
  savingsTransferRate: number;
  config: PricingConfig;
}

export interface QuoteResult {
  input: QuoteInput;
  cost: CostBreakdown;
  basePrice: number;
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

export interface QuoteHistoryEntry extends QuoteResult {
  id: string;
  createdAt: string;
}
