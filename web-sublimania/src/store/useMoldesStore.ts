// ============================================================
//  store/useMoldesStore.ts — Tipos de molde (prenda)
//  Backed by Supabase. Optimistic updates.
//  Llamar init() después de que la sesión esté disponible.
// ============================================================
import { create } from 'zustand';
import { supabase } from '../utils/supabase';
import { useAuthStore } from './useAuthStore';
import { useToastStore } from './useToastStore';
import type { Molde } from '../types';

function errToast(label: string, err: unknown) {
  const msg = err instanceof Error ? err.message : String((err as { message?: string })?.message ?? err);
  console.error(label, err);
  useToastStore.getState().push(`${label}: ${msg}`, 'error');
}

export const MOLDE_DEFAULT_ID = 'camiseta';

export const MOLDES_DEFAULT: Molde[] = [
  { id: 'camiseta', nombre: 'CAMISETA', tipo: 'camiseta' },
];

function getOrgId(): string {
  const orgId = useAuthStore.getState().session?.user.orgId;
  if (!orgId) throw new Error('No org_id — usuario no autenticado');
  return orgId;
}

interface MoldesState {
  moldes:  Molde[];
  loading: boolean;
  init:        () => Promise<void>;
  addMolde:    (nombre: string) => string;
  renameMolde: (id: string, nombre: string) => void;
  removeMolde: (id: string) => void;
  setTipo:     (id: string, tipo: 'camiseta' | 'pantaloneta') => void;
}

export const useMoldesStore = create<MoldesState>()((set, get) => ({
  moldes:  MOLDES_DEFAULT,
  loading: false,

  // ── Carga inicial desde Supabase ─────────────────────────────
  init: async () => {
    const orgId = getOrgId();
    set({ loading: true });
    const { data, error } = await supabase
      .from('moldes')
      .select('id, nombre, tipo')
      .eq('org_id', orgId)
      .order('created_at');
    set({ loading: false });
    if (error) { errToast('moldes.init:', error); return; }

    // Org nueva sin moldes → insertar el default
    if (!data || data.length === 0) {
      await supabase.from('moldes').insert({
        id:     MOLDE_DEFAULT_ID,
        org_id: orgId,
        nombre: 'CAMISETA',
        tipo:   'camiseta',
      });
      set({ moldes: MOLDES_DEFAULT });
      return;
    }

    set({ moldes: data.map(r => ({ id: r.id, nombre: r.nombre, tipo: (r.tipo ?? 'camiseta') as 'camiseta' | 'pantaloneta' })) });
  },

  // ── Mutations — optimistic ────────────────────────────────────
  addMolde: (nombre) => {
    const id    = nombre.trim().toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
    const orgId = getOrgId();
    const entry: Molde = { id, nombre: nombre.trim().toUpperCase(), tipo: 'camiseta' };
    set(s => ({ moldes: [...s.moldes, entry] }));
    supabase.from('moldes').insert({ id, org_id: orgId, nombre: entry.nombre, tipo: 'camiseta' })
      .then(({ error }) => {
        if (error) {
          errToast('moldes.add:', error);
          set(s => ({ moldes: s.moldes.filter(m => m.id !== id) }));
        }
      });
    return id;
  },

  renameMolde: (id, nombre) => {
    const prev = get().moldes;
    const nombre_up = nombre.trim().toUpperCase();
    set(s => ({ moldes: s.moldes.map(m => m.id === id ? { ...m, nombre: nombre_up } : m) }));
    supabase.from('moldes').update({ nombre: nombre_up }).eq('id', id)
      .then(({ error }) => {
        if (error) { errToast('moldes.rename:', error); set({ moldes: prev }); }
      });
  },

  removeMolde: (id) => {
    if (get().moldes.length <= 1) return;
    const prev = get().moldes;
    set(s => ({ moldes: s.moldes.filter(m => m.id !== id) }));
    supabase.from('moldes').delete().eq('id', id)
      .then(({ error }) => {
        if (error) { errToast('moldes.remove:', error); set({ moldes: prev }); }
      });
  },

  setTipo: (id, tipo) => {
    set(s => ({ moldes: s.moldes.map(m => m.id === id ? { ...m, tipo } : m) }));
    supabase.from('moldes').update({ tipo }).eq('id', id)
      .then(({ error }) => { if (error) errToast('moldes.setTipo:', error); });
  },
}));
