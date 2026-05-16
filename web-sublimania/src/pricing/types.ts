export type CustomerSegment = 'vip' | 'normal';
export type Gender = 'H' | 'M';
export type ProductId = 'camiseta' | 'pantaloneta' | 'equipo' | 'por_cm';
export type PrintProfileId = string;
export type MeasurementSource = 'real' | 'estimated';

export interface HeatPress {
  id: string;
  name: string;
  widthCm: number;
  heightCm: number;
  cost: number;
  lifeBajadas: number;
  paperSheetsPerBajada: number;
}

export interface Plotter {
  id: string;
  name: string;
  widthCm: number;
}

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
  defaultFabricCamisetaId: string | null;
  defaultFabricPantalonetaId: string | null;
  orgNombre: string;
  presses: HeatPress[];
  selectedPressId: string | null;
  plotters: Plotter[];
  selectedPlotterId: string | null;
  perBajadaSupplyIds: string[];
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
  pressBajadas: number;
  pressCostPerUnit: number;
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
  widthCm?: number;
  manualPrice?: number;
  savingsTransferRate: number;
  config: PricingConfig;
  tallaDims?: { ALTO: string; ANCHO: string; MANGA_ANCHO: string; MANGA_ALTO: string };
  tallaDimsPant?: { ALTO: string; ANCHO: string; MANGA_ANCHO: string; MANGA_ALTO: string };
  serviceMode?: 'sublimation' | 'full_service' | 'paper';
  fabrics?: FabricType[];
  selectedFabricIdCamiseta?: string | null;
  selectedFabricIdPantaloneta?: string | null;
  basePricesCompleto?: BasePrice[];
  cmPriceTiers?: CmPriceTier[];
  paperPriceTiers?: CmPriceTier[];
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

export interface CmPriceTier {
  id: string;
  maxCm: number;
  price: number;
}

export interface Competitor {
  id: string;
  name: string;
  prices: Partial<Record<MarketProductId, number>>;
}

export interface QuoteHistoryEntry extends QuoteResult {
  id: string;
  createdAt: string;
}

export interface OrderLine {
  id: string;
  productId: ProductId;
  talla: string;
  quantity: number;
  linearCm: number;
  widthCm: number;
  manualPrice: string;
}

export interface CotizacionLine {
  productId: string;
  talla: string;
  quantity: number;
  volumeDiscount: number;
  finalUnitPrice: number;
  totalPrice: number;
}

export interface CotizacionEditorState {
  orderLines: OrderLine[];
  selectedClienteId: string | null;
  customerSegment: CustomerSegment;
  profileId: string;
  serviceMode: 'sublimation' | 'full_service' | 'paper';
  fabricCamisetaId: string | null;
  fabricPantalonetaId: string | null;
}

export interface CotizacionHistoryEntry {
  id: string;
  createdAt: string;
  clienteNombre: string;
  orgNombre: string;
  serviceMode: 'sublimation' | 'full_service' | 'paper';
  fabricCamisetaNombre: string | null;
  fabricPantalonetaNombre: string | null;
  lines: CotizacionLine[];
  totalUnits: number;
  totalPrice: number;
  totalProfit: number;
  overallMargin: number;
  editorState: CotizacionEditorState;
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
  serviceMode?: 'sublimation' | 'full_service';
  fabricCamisetaNombre?: string | null;
  fabricPantalonetaNombre?: string | null;
}
