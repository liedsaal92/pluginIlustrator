import { machines } from '../data/machines';
import { operations } from '../data/operations';
import { printProfiles } from '../data/printProfiles';
import { supplies } from '../data/supplies';
import { sizeMeasurements } from '../data/sizeMeasurements';
import type { BasePrice, CostBreakdown, PricingConfig, PrintProfileId, ProductId, CustomerSegment } from '../types';

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function getCostPerMeter(profileId: PrintProfileId, config: PricingConfig): number {
  const profile = printProfiles.find(p => p.id === profileId);
  if (!profile) throw new Error(`Perfil no encontrado: ${profileId}`);

  const paper = supplies.find(s => s.id === 'paper_sublimation')!;
  const ink = supplies.find(s => s.id === 'ink_base')!;
  const newspaper = supplies.find(s => s.id === 'newspaper')!;

  const suppliesCost =
    paper.totalCost / paper.quantity +
    (ink.totalCost / ink.quantity) * profile.inkFactor +
    newspaper.totalCost / newspaper.quantity;

  const machineCost = machines.reduce((sum, item) => sum + item.cost / item.lifeMeters, 0);
  const operationCost = operations.reduce((sum, item) => sum + item.monthlyCost, 0) / config.monthlyMeters;

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

function getMetersForProduct(productId: ProductId, basePrices: BasePrice[], segment: CustomerSegment, size: number, linearCm?: number) {
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
  linearCm?: number;
  config: PricingConfig;
}): CostBreakdown {
  const costPerMeter = getCostPerMeter(input.profileId, input.config);
  const normalCostPerMeter = getCostPerMeter('normal', input.config);
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
