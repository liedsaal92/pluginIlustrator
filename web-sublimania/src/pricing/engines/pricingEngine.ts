import { calculateCost } from './costEngine';
import type { ProductId, QuoteInput, QuoteResult, VolumeTier } from '../types';

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function roundUpTo(value: number, increment: number): number {
  if (!increment || increment <= 0) return roundMoney(value);
  return roundMoney(Math.ceil(value / increment) * increment);
}

function getCmTierPrice(cm: number, tiers: import('../types').CmPriceTier[]): number {
  if (!tiers.length) return 0;
  const sorted = [...tiers].sort((a, b) => a.maxCm - b.maxCm);
  const tier = sorted.find(t => cm <= t.maxCm);
  return tier ? tier.price : sorted[sorted.length - 1].price;
}

function getBasePrice(input: QuoteInput): number {
  if (input.productId === 'por_cm') {
    const cm = input.linearCm ?? 0;
    const rollWidth = input.config.rollWidthCm;
    const effectiveWidth = input.widthCm !== undefined ? input.widthCm : rollWidth;
    const widthRatio = rollWidth > 0 ? effectiveWidth / rollWidth : 1;
    if (input.serviceMode === 'paper' && input.paperPriceTiers?.length)
      return roundMoney(getCmTierPrice(cm, input.paperPriceTiers) * widthRatio);
    if (input.cmPriceTiers?.length) return roundMoney(getCmTierPrice(cm, input.cmPriceTiers) * widthRatio);
    return roundMoney(cm * input.config.pricePerCm * widthRatio);
  }
  const pool = (input.serviceMode === 'full_service' && input.basePricesCompleto?.length)
    ? input.basePricesCompleto
    : input.basePrices;
  const row = pool.find(item =>
    item.segment === input.customerSegment &&
    item.gender  === input.gender &&
    item.size    === input.size
  );
  if (!row) throw new Error(`Precio base no configurado: ${input.customerSegment} ${input.gender} ${input.size}`);
  return row[input.productId as Exclude<ProductId, 'por_cm'>];
}

function getVolumeTier(tiers: VolumeTier[], quantity: number): VolumeTier | null {
  return tiers.find(t => quantity >= t.from && (t.to === null || quantity <= t.to)) ?? null;
}

export function calculateQuote(input: QuoteInput): QuoteResult {
  const quantity = Math.max(1, input.quantity || 1);
  const normalizedInput = { ...input, quantity };

  const cost = calculateCost({
    productId: normalizedInput.productId,
    segment: normalizedInput.customerSegment,
    gender: normalizedInput.gender,
    size: normalizedInput.size,
    quantity,
    profileId: normalizedInput.profileId,
    profiles: normalizedInput.profiles,
    basePrices: normalizedInput.basePrices,
    supplies: normalizedInput.supplies,
    machines: normalizedInput.machines,
    operations: normalizedInput.operations,
    linearCm: normalizedInput.linearCm,
    widthCm: normalizedInput.widthCm,
    config: normalizedInput.config,
    tallaDims: normalizedInput.tallaDims,
    tallaDimsPant: normalizedInput.tallaDimsPant,
    serviceMode: normalizedInput.serviceMode,
    fabrics: normalizedInput.fabrics,
    selectedFabricIdCamiseta: normalizedInput.selectedFabricIdCamiseta,
    selectedFabricIdPantaloneta: normalizedInput.selectedFabricIdPantaloneta,
  });

  const basePrice = getBasePrice(normalizedInput);

  // Volume discount — applied to table price before margin floor
  const tier = getVolumeTier(normalizedInput.volumeTiers, quantity);
  const volumeDiscount = tier?.discount ?? 0;
  const discountedBasePrice = roundMoney(basePrice * (1 - volumeDiscount));
  const volumeDiscountAmount = roundMoney((basePrice - discountedBasePrice) * quantity);

  const minProfit = cost.unitCost * normalizedInput.config.minProfitRatio;
  const minPriceByMargin = cost.unitCost * (1 + normalizedInput.config.minMargin);
  const minPriceByProfit = cost.unitCost + minProfit;
  const minPrice = Math.max(minPriceByMargin, minPriceByProfit);

  const transferredSavings = roundMoney(cost.savingsPerUnit * normalizedInput.savingsTransferRate);
  const retainedSavings = roundMoney(cost.savingsPerUnit - transferredSavings);

  // Precio final = precio de tabla + descuento volumen + traslado de ahorro ECO al cliente
  const rawTablePrice = discountedBasePrice - transferredSavings;
  const tableUnitPrice = normalizedInput.config.roundingEnabled
    ? roundUpTo(rawTablePrice, normalizedInput.config.roundingIncrement)
    : roundMoney(rawTablePrice);

  // Piso financiero — solo informativo, no sobreescribe la tabla
  const recommendedUnitPrice = normalizedInput.config.roundingEnabled
    ? roundUpTo(minPrice, normalizedInput.config.roundingIncrement)
    : roundMoney(minPrice);

  const finalUnitPrice = normalizedInput.manualPrice && normalizedInput.manualPrice > 0
    ? normalizedInput.manualPrice
    : tableUnitPrice;

  const unitProfit  = roundMoney(finalUnitPrice - cost.unitCost);
  const totalPrice  = roundMoney(finalUnitPrice * quantity);
  const totalProfit = roundMoney(unitProfit * quantity);
  const margin      = cost.unitCost > 0 ? unitProfit / cost.unitCost : 0;

  const alerts: string[] = [];
  if (finalUnitPrice < minPrice) alerts.push('Precio por debajo del mínimo financiero.');
  if (margin < normalizedInput.config.minMargin) alerts.push('Markup menor al mínimo configurado.');
  if (unitProfit < minProfit) alerts.push('Ganancia por prenda menor a la relación 1:1 configurada.');
  if (cost.measurementSource === 'estimated') alerts.push('Cotización usa medidas estimadas.');
  if (!normalizedInput.tallaDims && normalizedInput.productId !== 'por_cm') {
    alerts.push('Medidas desde tabla por defecto — configurar referencia de tallas en COSTOS BASE para usar medidas reales.');
  }
  if (normalizedInput.savingsTransferRate > 0.75) alerts.push('Se está trasladando mucho ahorro ECO al cliente.');
  if (volumeDiscount > 0 && discountedBasePrice < minPrice) {
    alerts.push(`Descuento volumen (${Math.round(volumeDiscount * 100)}%) limitado por mínimo financiero.`);
  }

  return {
    input: normalizedInput,
    cost,
    basePrice,
    volumeDiscount,
    volumeDiscountAmount,
    minPriceByMargin: roundMoney(minPriceByMargin),
    minPriceByProfit: roundMoney(minPriceByProfit),
    minPrice: roundMoney(minPrice),
    transferredSavings,
    retainedSavings,
    recommendedUnitPrice,
    finalUnitPrice: roundMoney(finalUnitPrice),
    totalPrice,
    unitProfit,
    totalProfit,
    margin,
    alerts,
  };
}
