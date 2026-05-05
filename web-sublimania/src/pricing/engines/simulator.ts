import { calculateQuote } from './pricingEngine';
import type { QuoteInput } from '../types';

export function compareProfiles(input: QuoteInput) {
  return input.profiles
    .filter(p => p.enabled)
    .map(profile => calculateQuote({ ...input, profileId: profile.id }));
}
