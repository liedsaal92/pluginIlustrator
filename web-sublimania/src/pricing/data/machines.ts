import type { MachineCost } from '../types';

export const machines: MachineCost[] = [
  { id: 'plotter', name: 'Plotter', cost: 5750, lifeMeters: 80000 },
  { id: 'head', name: 'Cabezal', cost: 1725, lifeMeters: 20000 },
  { id: 'press', name: 'Plancha', cost: 3657, lifeMeters: 100000 },
  { id: 'other', name: 'Otros', cost: 2760, lifeMeters: 80000 },
];