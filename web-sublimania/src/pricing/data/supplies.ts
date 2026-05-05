import type { Supply } from '../types';

export const defaultSupplies: Supply[] = [
  { id: 'paper_sublimation', name: 'Papel sublimacion', totalCost: 61.18, quantity: 180, unit: 'm', applyInkFactor: false },
  { id: 'ink_base', name: 'Tinta base', totalCost: 69, quantity: 75, unit: 'm', applyInkFactor: true },
  { id: 'newspaper', name: 'Papel periodico', totalCost: 43, quantity: 1000, unit: 'm', applyInkFactor: false },
];
