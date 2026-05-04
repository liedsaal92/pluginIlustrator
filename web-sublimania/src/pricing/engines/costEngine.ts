import { sizeMeasurements } from '../data/sizeMeasurements';
import type {
  BasePrice, CostBreakdown, FabricType, MachineCost, OperationCost,
  PricingConfig, PrintProfile, PrintProfileId, ProductId, CustomerSegment, Supply,
} from '../types';

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calcShirtMetersFromDims(
  dims: { ALTO: string; ANCHO: string; MANGA_ANCHO: string; MANGA_ALTO: string },
  plotterWidthCm: number,
): number {
  const ancho      = parseFloat(dims.ANCHO)       || 0;
  const alto       = parseFloat(dims.ALTO)        || 0;
  const mangaAncho = parseFloat(dims.MANGA_ANCHO) || 0;
  const mangaAlto  = parseFloat(dims.MANGA_ALTO)  || 0;
  const torsoM  = (ancho * 2 <= plotterWidthCm ? alto      : alto * 2)      / 100;
  const sleeveM = (mangaAncho * 2 <= plotterWidthCm ? mangaAlto : mangaAlto * 2) / 100;
  return torsoM + sleeveM;
}

function computeCostWithInkFactor(
  inkFactor: number,
  config: PricingConfig,
  supplies: Supply[],
  machines: MachineCost[],
  operations: OperationCost[],
): number {
  const suppliesCost = supplies.reduce((sum, s) => {
    if (!s.quantity || s.quantity <= 0) return sum;
    const cpm = s.totalCost / s.quantity;
    return sum + (s.applyInkFactor ? cpm * inkFactor : cpm);
  }, 0);

  const machineCost = machines.reduce((sum, m) => {
    if (!m.lifeMeters || m.lifeMeters <= 0) return sum;
    return sum + m.cost / m.lifeMeters;
  }, 0);

  const monthlyMeters = config.monthlyMeters > 0 ? config.monthlyMeters : 1;
  const operationCost = operations.reduce((sum, o) => sum + o.monthlyCost, 0) / monthlyMeters;

  return suppliesCost + machineCost + operationCost;
}

export function getCostPerMeter(
  profileId: PrintProfileId,
  config: PricingConfig,
  supplies: Supply[],
  machines: MachineCost[],
  operations: OperationCost[],
  profiles: PrintProfile[],
): number {
  const profile = profiles.find(p => p.id === profileId);
  if (!profile) throw new Error(`Perfil no encontrado: ${profileId}`);
  return computeCostWithInkFactor(profile.inkFactor, config, supplies, machines, operations);
}

export function getSizeMeasurement(size: number) {
  const measurement = sizeMeasurements.find(item => item.size === size);
  if (!measurement) throw new Error(`Talla no configurada: ${size}`);
  return measurement;
}

function getBasePrice(basePrices: BasePrice[], segment: CustomerSegment, size: number) {
  const price = basePrices.find(item => item.segment === segment && item.size === size);
  if (!price) throw new Error(`Precio base no configurado: ${segment} ${size}`);
  return price;
}

function getMetersForProduct(
  productId: ProductId,
  basePrices: BasePrice[],
  segment: CustomerSegment,
  size: number,
  plotterWidthCm: number,
  linearCm?: number,
  tallaDims?: { ALTO: string; ANCHO: string; MANGA_ANCHO: string; MANGA_ALTO: string },
) {
  const notes: string[] = [];

  if (productId === 'por_cm') {
    const cm = Math.max(0, linearCm ?? 0);
    return { meters: cm / 100, camisetaMeters: 0, pantalonetaMeters: 0, source: 'real' as const, notes };
  }

  const shirtMeters = tallaDims
    ? calcShirtMetersFromDims(tallaDims, plotterWidthCm)
    : getSizeMeasurement(size).shirtMeters;
  const source = tallaDims ? 'real' as const : 'real' as const;

  if (productId === 'camiseta') {
    return { meters: shirtMeters, camisetaMeters: shirtMeters, pantalonetaMeters: 0, source, notes };
  }

  const prices = getBasePrice(basePrices, segment, size);
  const ratio = prices.pantaloneta / prices.camiseta;

  if (productId === 'pantaloneta') {
    if (!tallaDims) notes.push('Pantaloneta estimada por proporcion hasta configurar medidas reales.');
    const pMeters = shirtMeters * ratio;
    return { meters: pMeters, camisetaMeters: 0, pantalonetaMeters: pMeters, source: tallaDims ? source : 'estimated' as const, notes };
  }

  // equipo
  if (!tallaDims) notes.push('Equipo usa camiseta real + pantaloneta estimada.');
  const pMeters = shirtMeters * ratio;
  return {
    meters: shirtMeters + pMeters,
    camisetaMeters: shirtMeters,
    pantalonetaMeters: pMeters,
    source: tallaDims ? source : 'estimated' as const,
    notes,
  };
}

export function calculateCost(input: {
  productId: ProductId;
  segment: CustomerSegment;
  size: number;
  quantity: number;
  profileId: PrintProfileId;
  profiles: PrintProfile[];
  basePrices: BasePrice[];
  supplies: Supply[];
  machines: MachineCost[];
  operations: OperationCost[];
  linearCm?: number;
  config: PricingConfig;
  tallaDims?: { ALTO: string; ANCHO: string; MANGA_ANCHO: string; MANGA_ALTO: string };
  serviceMode?: 'sublimation' | 'full_service';
  fabrics?: FabricType[];
  selectedFabricIdCamiseta?: string | null;
  selectedFabricIdPantaloneta?: string | null;
}): CostBreakdown {
  const costPerMeter = getCostPerMeter(input.profileId, input.config, input.supplies, input.machines, input.operations, input.profiles);
  // baseline is always inkFactor=1 (full ink), independent of which profile is 'normal'
  const normalCostPerMeter = computeCostWithInkFactor(1, input.config, input.supplies, input.machines, input.operations);
  const productMeters = getMetersForProduct(
    input.productId, input.basePrices, input.segment, input.size,
    input.config.rollWidthCm, input.linearCm, input.tallaDims,
  );
  const wasteRate = input.config.wasteRate;
  const metersUnit = productMeters.meters * (1 + wasteRate);
  const printCostPerUnit = roundMoney(metersUnit * costPerMeter);
  const normalPrintCostPerUnit = roundMoney(metersUnit * normalCostPerMeter);

  // ── Servicio completo ──────────────────────────────────────
  const isFullService = input.serviceMode === 'full_service';
  const fabrics = input.fabrics ?? [];

  let fabricCostPerUnit = 0;
  let tailoringCostPerUnit = 0;
  let polinesCostPerUnit = 0;

  if (isFullService) {
    const fabricC = fabrics.find(f => f.id === input.selectedFabricIdCamiseta);
    const fabricP = fabrics.find(f => f.id === input.selectedFabricIdPantaloneta);
    const effC = fabricC ? fabricC.metersPerKg * (fabricC.tubular ? 2 : 1) : 0;
    const effP = fabricP ? fabricP.metersPerKg * (fabricP.tubular ? 2 : 1) : 0;
    const priceC = effC > 0 ? fabricC!.costPerKg / effC : 0;
    const priceP = effP > 0 ? fabricP!.costPerKg / effP : 0;

    const { productId } = input;
    if (productId === 'camiseta') {
      fabricCostPerUnit = roundMoney(metersUnit * priceC);
      tailoringCostPerUnit = input.config.tailoringCamiseta ?? 0;
    } else if (productId === 'pantaloneta') {
      fabricCostPerUnit = roundMoney(metersUnit * priceP);
      tailoringCostPerUnit = input.config.tailoringPantaloneta ?? 0;
    } else if (productId === 'equipo') {
      const cM = productMeters.camisetaMeters * (1 + wasteRate);
      const pM = productMeters.pantalonetaMeters * (1 + wasteRate);
      fabricCostPerUnit = roundMoney(cM * priceC + pM * priceP);
      tailoringCostPerUnit = (input.config.tailoringCamiseta ?? 0) + (input.config.tailoringPantaloneta ?? 0);
    }
    polinesCostPerUnit = input.config.polinesCost ?? 0;
  }

  const unitCost = roundMoney(printCostPerUnit + fabricCostPerUnit + tailoringCostPerUnit + polinesCostPerUnit);

  return {
    profileId: input.profileId,
    costPerMeter,
    normalCostPerMeter,
    metersUnit,
    printCostPerUnit,
    fabricCostPerUnit,
    tailoringCostPerUnit,
    polinesCostPerUnit,
    unitCost,
    totalCost: roundMoney(unitCost * input.quantity),
    savingsPerUnit: Math.max(0, roundMoney(normalPrintCostPerUnit - printCostPerUnit)),
    measurementSource: productMeters.source,
    notes: productMeters.notes,
  };
}
