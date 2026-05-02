import { calculateCost } from './costEngine';
import type { ProductId, QuoteInput, QuoteResult } from '../types';

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function roundUpTo(value: number, increment: number): number {
  if (!increment || increment <= 0) return roundMoney(value);
  return roundMoney(Math.ceil(value / increment) * increment);
}

function getBasePrice(input: QuoteInput): number {
  if (input.productId === 'por_cm') return roundMoney((input.linearCm ?? 0) * input.config.pricePerCm);

  const row = input.basePrices.find(item => item.segment === input.customerSegment && item.size === input.size);
  if (!row) throw new Error(`Precio base no configurado: ${input.customerSegment} ${input.size}`);
  return row[input.productId as Exclude<ProductId, 'por_cm'>];
}

export function calculateQuote(input: QuoteInput): QuoteResult {
  const quantity = Math.max(1, input.quantity || 1);
  const normalizedInput = { ...input, quantity };
  const cost = calculateCost({
    productId: normalizedInput.productId,
    segment: normalizedInput.customerSegment,
    size: normalizedInput.size,
    quantity,
    profileId: normalizedInput.profileId,
    basePrices: normalizedInput.basePrices,
    linearCm: normalizedInput.linearCm,
    config: normalizedInput.config,
  });
  const basePrice = getBasePrice(normalizedInput);
  const minProfit = cost.unitCost * normalizedInput.config.minProfitRatio;
  const minPriceByMargin = cost.unitCost / (1 - normalizedInput.config.minMargin);
  const minPriceByProfit = cost.unitCost + minProfit;
  const minPrice = Math.max(minPriceByMargin, minPriceByProfit);
  const transferredSavings = roundMoney(cost.savingsPerUnit * normalizedInput.savingsTransferRate);
  const retainedSavings = roundMoney(cost.savingsPerUnit - transferredSavings);
  const rawRecommended = Math.max(minPrice, basePrice) - transferredSavings;
  const recommendedUnitPrice = normalizedInput.config.roundingEnabled
    ? roundUpTo(rawRecommended, normalizedInput.config.roundingIncrement)
    : roundMoney(rawRecommended);
  const finalUnitPrice = normalizedInput.manualPrice && normalizedInput.manualPrice > 0
    ? normalizedInput.manualPrice
    : recommendedUnitPrice;
  const unitProfit = roundMoney(finalUnitPrice - cost.unitCost);
  const totalPrice = roundMoney(finalUnitPrice * quantity);
  const totalProfit = roundMoney(unitProfit * quantity);
  const margin = finalUnitPrice > 0 ? unitProfit / finalUnitPrice : 0;
  const alerts: string[] = [];

  if (finalUnitPrice < minPrice) alerts.push('Precio por debajo del minimo financiero.');
  if (margin < normalizedInput.config.minMargin) alerts.push('Margen menor al minimo configurado.');
  if (unitProfit < minProfit) alerts.push('Ganancia por prenda menor a la relacion 1:1 configurada.');
  if (cost.measurementSource === 'estimated') alerts.push('Esta cotizacion usa medidas estimadas.');
  if (normalizedInput.savingsTransferRate > 0.75) alerts.push('Se esta trasladando mucho ahorro ECO al cliente.');

  return {
    input: normalizedInput,
    cost,
    basePrice,
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
