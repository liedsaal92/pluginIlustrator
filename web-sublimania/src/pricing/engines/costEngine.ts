import { printProfiles } from '../data/printProfiles';
import { sizeMeasurements } from '../data/sizeMeasurements';
import type {
  BasePrice, CostBreakdown, MachineCost, OperationCost,
  PricingConfig, PrintProfileId, ProductId, CustomerSegment, Supply,
} from '../types';

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function getCostPerMeter(
  profileId: PrintProfileId,
  config: PricingConfig,
  supplies: Supply[],
  machines: MachineCost[],
  operations: OperationCost[],
): number {
  const profile = printProfiles.find(p => p.id === profileId);
  if (!profile) throw new Error(`Perfil no encontrado: ${profileId}`);

  const suppliesCost = supplies.reduce((sum, s) => {
    if (!s.quantity || s.quantity <= 0) return sum;
    const cpm = s.totalCost / s.quantity;
    return sum + (s.applyInkFactor ? cpm * profile.inkFactor : cpm);
  }, 0);

  const machineCost = machines.reduce((sum, m) => {
    if (!m.lifeMeters || m.lifeMeters <= 0) return sum;
    return sum + m.cost / m.lifeMeters;
  }, 0);

  const monthlyMeters = config.monthlyMeters > 0 ? config.monthlyMeters : 1;
  const operationCost = operations.reduce((sum, o) => sum + o.monthlyCost, 0) / monthlyMeters;

  return suppliesCost + machineCost + operationCost;
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
  linearCm?: number,
) {
  const measurement = getSizeMeasurement(size);
  const prices = getBasePrice(basePrices, segment, size);
  const notes: string[] = [];

  if (productId === 'camiseta') {
    return { meters: measurement.shirtMeters, source: 'real' as const, notes };
  }

  if (productId === 'pantaloneta') {
    const ratio = prices.pantaloneta / prices.camiseta;
    notes.push('Pantaloneta estimada por proporcion hasta configurar medidas reales.');
    return { meters: measurement.shirtMeters * ratio, source: 'estimated' as const, notes };
  }

  if (productId === 'equipo') {
    const ratio = prices.pantaloneta / prices.camiseta;
    notes.push('Equipo usa camiseta real + pantaloneta estimada.');
    return { meters: measurement.shirtMeters * (1 + ratio), source: 'estimated' as const, notes };
  }

  const cm = Math.max(0, linearCm ?? 0);
  return { meters: cm / 100, source: 'real' as const, notes };
}

export function calculateCost(input: {
  productId: ProductId;
  segment: CustomerSegment;
  size: number;
  quantity: number;
  profileId: PrintProfileId;
  basePrices: BasePrice[];
  supplies: Supply[];
  machines: MachineCost[];
  operations: OperationCost[];
  linearCm?: number;
  config: PricingConfig;
}): CostBreakdown {
  const costPerMeter = getCostPerMeter(input.profileId, input.config, input.supplies, input.machines, input.operations);
  const normalCostPerMeter = getCostPerMeter('normal', input.config, input.supplies, input.machines, input.operations);
  const productMeters = getMetersForProduct(input.productId, input.basePrices, input.segment, input.size, input.linearCm);
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
