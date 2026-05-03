import type { VolumeTier } from '../types';

export const defaultVolumeTiers: VolumeTier[] = [
  { id: 'tier1', from: 1,  to: 9,    discount: 0 },
  { id: 'tier2', from: 10, to: 19,   discount: 0.05 },
  { id: 'tier3', from: 20, to: 49,   discount: 0.10 },
  { id: 'tier4', from: 50, to: null, discount: 0.15 },
];
