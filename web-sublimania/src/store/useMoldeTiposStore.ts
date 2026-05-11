// ============================================================
//  store/useMoldeTiposStore.ts — Tipo de molde (camiseta | pantaloneta)
//  Solo localStorage — sin Supabase. Persist key: sublimania_molde_tipos_v1
// ============================================================
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type MoldeTipo = 'camiseta' | 'pantaloneta';

interface MoldeTiposState {
  tipos: Record<string, MoldeTipo>;
  setTipo: (moldeId: string, tipo: MoldeTipo) => void;
  getTipo: (moldeId: string) => MoldeTipo;
}

export const useMoldeTiposStore = create<MoldeTiposState>()(
  persist(
    (set, get) => ({
      tipos: {},

      setTipo: (moldeId, tipo) =>
        set(s => ({ tipos: { ...s.tipos, [moldeId]: tipo } })),

      getTipo: (moldeId) => get().tipos[moldeId] ?? 'camiseta',
    }),
    { name: 'sublimania_molde_tipos_v1' }
  )
);
