import type { PrintProfile } from '../types';

export const defaultPrintProfiles: PrintProfile[] = [
  { id: 'normal',    name: 'NORMAL',    inkFactor: 1,    enabled: true },
  { id: 'eco',       name: 'ECO',       inkFactor: 0.75, enabled: true },
  { id: 'super_eco', name: 'SUPER ECO', inkFactor: 0.68, enabled: true },
  { id: 'ultra_eco', name: 'ULTRA ECO', inkFactor: 0.63, enabled: true },
];

// backward-compat alias
export const printProfiles = defaultPrintProfiles;
