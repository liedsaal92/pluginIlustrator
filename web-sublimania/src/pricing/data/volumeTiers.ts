import type { ProductId, VolumeTier } from '../types';

const BASE_TIERS: VolumeTier[] = [
  { id: 'tier1', from: 1,  to: 9,    discount: 0 },
  { id: 'tier2', from: 10, to: 19,   discount: 0.05 },
  { id: 'tier3', from: 20, to: 49,   discount: 0.10 },
  { id: 'tier4', from: 50, to: null, discount: 0.15 },
];

export const defaultVolumeTiers: VolumeTier[] = BASE_TIERS;

export const defaultVolumeTiersByProduct: Record<ProductId, VolumeTier[]> = {
  camiseta:    BASE_TIERS.map(t => ({ ...t, id: `cam_${t.id}` })),
  pantaloneta: BASE_TIERS.map(t => ({ ...t, id: `pan_${t.id}` })),
  equipo:      BASE_TIERS.map(t => ({ ...t, id: `equ_${t.id}` })),
  por_cm:      [],
};
