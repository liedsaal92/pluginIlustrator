import { printProfiles } from '../data/printProfiles';
import { calculateQuote } from './pricingEngine';
import type { QuoteInput } from '../types';

export function compareProfiles(input: QuoteInput) {
  return printProfiles.map(profile => calculateQuote({ ...input, profileId: profile.id }));
}