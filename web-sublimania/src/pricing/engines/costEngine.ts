import { sizeMeasurements } from '../data/sizeMeasurements';
import type {
  BasePrice, CostBreakdown, MachineCost, OperationCost,
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
    return { meters: cm / 100, source: 'real' as const, notes };
  }

  const shirtMeters = tallaDims
    ? calcShirtMetersFromDims(tallaDims, plotterWidthCm)
    : getSizeMeasurement(size).shirtMeters;
  const source = tallaDims ? 'real' as const : 'real' as const;

  if (productId === 'camiseta') {
    return { meters: shirtMeters, source, notes };
  }

  const prices = getBasePrice(basePrices, segment, size);
  const ratio = prices.pantaloneta / prices.camiseta;

  if (productId === 'pantaloneta') {
    if (!tallaDims) notes.push('Pantaloneta estimada por proporcion hasta configurar medidas reales.');
    return { meters: shirtMeters * ratio, source: tallaDims ? source : 'estimated' as const, notes };
  }

  // equipo
  if (!tallaDims) notes.push('Equipo usa camiseta real + pantaloneta estimada.');
  return { meters: shirtMeters * (1 + ratio), source: tallaDims ? source : 'estimated' as const, notes };
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
}): CostBreakdown {
  const costPerMeter = getCostPerMeter(input.profileId, input.config, input.supplies, input.machines, input.operations, input.profiles);
  // baseline is always inkFactor=1 (full ink), independent of which profile is 'normal'
  const normalCostPerMeter = computeCostWithInkFactor(1, input.config, input.supplies, input.machines, input.operations);
  const productMeters = getMetersForProduct(
    input.productId, input.basePrices, input.segment, input.size,
    input.config.rollWidthCm, input.linearCm, input.tallaDims,
  );
  const metersUnit = productMeters.meters * (1 + input.config.wasteRate);
  const unitCost = roundMoney(metersUnit * costPerMeter);
  const normalUnitCost = roundMoney(metersUnit * normalCostPerMeter);

  return {
    profileId: input.profileId,
    costPerMeter,
    normalCostPerMeter,
    metersUnit,
    unitCost,
    totalCost: roundMoney(unitCost * input.quantity),
    savingsPerUnit: Math.max(0, roundMoney(normalUnitCost - unitCost)),
    measurementSource: productMeters.source,
    notes: productMeters.notes,
  };
}
