import type { QuoteInput } from './types';

export function validateQuoteInput(input: QuoteInput): string[] {
  const errors: string[] = [];
  if (!input.quantity || input.quantity < 1) errors.push('La cantidad debe ser mayor a cero.');
  if (input.productId === 'por_cm' && (!input.linearCm || input.linearCm <= 0)) {
    errors.push('Ingresa los centimetros a sublimar.');
  }
  if (input.config.minMargin <= 0 || input.config.minMargin >= 0.95) {
    errors.push('El markup mínimo Normal debe estar entre 1% y 95%.');
  }
  if (input.config.minMarginVip != null && (input.config.minMarginVip <= 0 || input.config.minMarginVip >= 0.95)) {
    errors.push('El markup mínimo VIP debe estar entre 1% y 95%.');
  }
  if (input.config.minMarginCm != null && (input.config.minMarginCm <= 0 || input.config.minMarginCm >= 0.95)) {
    errors.push('El markup mínimo POR CM debe estar entre 1% y 95%.');
  }
  return errors;
}