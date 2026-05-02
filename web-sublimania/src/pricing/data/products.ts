import type { Product } from '../types';

export const products: Product[] = [
  { id: 'camiseta', name: 'Camiseta', calculation: 'shirt_measurements', measurementSource: 'real' },
  { id: 'pantaloneta', name: 'Pantaloneta', calculation: 'shorts_estimate', measurementSource: 'estimated' },
  { id: 'equipo', name: 'Equipo completo', calculation: 'combo', measurementSource: 'estimated' },
  { id: 'por_cm', name: 'Por centimetros', calculation: 'linear_cm', measurementSource: 'real' },
];