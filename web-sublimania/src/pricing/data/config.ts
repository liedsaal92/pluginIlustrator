import type { PricingConfig } from '../types';

export const defaultPricingConfig: PricingConfig = {
  monthlyMeters: 600,
  minMargin: 0.45,
  minProfitRatio: 1,
  wasteRate: 0,
  rollWidthCm: 130,
  roundingEnabled: false,
  roundingIncrement: 0.1,
  comboDiscount: 0.5,
  pricePerCm: 0.05,
};
