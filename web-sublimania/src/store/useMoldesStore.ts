// ============================================================
//  store/useMoldesStore.ts — Tipos de molde (prenda)
//  Persiste en localStorage como "sublimania_moldes_v1"
// ============================================================
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Molde } from '../types';

export const MOLDE_DEFAULT_ID = 'camiseta';

export const MOLDES_DEFAULT: Molde[] = [
  { id: 'camiseta', nombre: 'CAMISETA' },
];

interface MoldesState {
  moldes: Molde[];
  addMolde:    (nombre: string) => string;   // returns new id
  renameMolde: (id: string, nombre: string) => void;
  removeMolde: (id: string) => void;
}

export const useMoldesStore = create<MoldesState>()(
  persist(
    (set, get) => ({
      moldes: MOLDES_DEFAULT,

      addMolde: (nombre) => {
        const id = nombre.trim().toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
        set(s => ({ moldes: [...s.moldes, { id, nombre: nombre.trim().toUpperCase() }] }));
        return id;
      },

      renameMolde: (id, nombre) => {
        set(s => ({
          moldes: s.moldes.map(m => m.id === id ? { ...m, nombre: nombre.trim().toUpperCase() } : m),
        }));
      },

      removeMolde: (id) => {
        if (get().moldes.length <= 1) return; // always keep at least one
        set(s => ({ moldes: s.moldes.filter(m => m.id !== id) }));
      },
    }),
    { name: 'sublimania_moldes_v1' }
  )
);
