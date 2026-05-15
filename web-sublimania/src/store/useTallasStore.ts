// ============================================================
//  store/useTallasStore.ts — Dimensiones de tallas
//  Estructura: clienteId → moldeId → tallaNombre → TallaDims
//  Backed by Supabase (tabla tallas_config).
// ============================================================
import { create } from 'zustand';
import { supabase } from '../utils/supabase';
import { useAuthStore } from './useAuthStore';
import { useTallasDefaultStore } from './useTallasDefaultStore';
import { useToastStore } from './useToastStore';
import type { TallaDims } from '../types';
export { MOLDE_DEFAULT_ID } from './useMoldesStore';
export { TALLAS_DEFAULT, TALLAS_BASE_EMPTY } from './tallasConstants';

function errToast(label: string, err: unknown) {
  console.error(label, err);
  const msg = err instanceof Error ? err.message : String((err as { message?: string })?.message ?? err);
  useToastStore.getState().push(`Error al guardar tallas: ${msg}`, 'error');
}

const EMPTY_DIMS: TallaDims = { ALTO: '', ANCHO: '', MANGA_ANCHO: '', MANGA_ALTO: '' };

// Mapeo de keys TypeScript → columnas SQL
const DIM_COL: Record<keyof TallaDims, string> = {
  ALTO:        'alto',
  ANCHO:       'ancho',
  MANGA_ANCHO: 'manga_ancho',
  MANGA_ALTO:  'manga_alto',
};

function normalizeDims(d: Partial<TallaDims>): TallaDims {
  return {
    ALTO:        d.ALTO        ?? '',
    ANCHO:       d.ANCHO       ?? '',
    MANGA_ANCHO: d.MANGA_ANCHO ?? '',
    MANGA_ALTO:  d.MANGA_ALTO  ?? '',
  };
}

function getOrgId(): string {
  const orgId = useAuthStore.getState().session?.user.orgId;
  if (!orgId) throw new Error('No org_id — usuario no autenticado');
  return orgId;
}

type TallasPorCliente = Record<string, Record<string, Record<string, TallaDims>>>;

interface TallasState {
  tallasPorCliente: TallasPorCliente;
  loading: boolean;

  init:                   () => Promise<void>;
  getTallas:              (clienteId: string, moldeId: string) => Record<string, TallaDims>;
  setDim:                 (clienteId: string, moldeId: string, talla: string, field: keyof TallaDims, value: string) => void;
  addTalla:               (clienteId: string, moldeId: string, talla: string) => void;
  removeTalla:            (clienteId: string, moldeId: string, talla: string) => void;
  initClienteFromDefault: (clienteId: string, moldeId: string) => Promise<void>;
  removeCliente:          (clienteId: string) => void;
  removeMoldeData:        (moldeId: string) => void;
}

export const useTallasStore = create<TallasState>()((set, get) => ({
  tallasPorCliente: {},
  loading: false,

  // ── Carga inicial desde Supabase ─────────────────────────────
  init: async () => {
    const orgId = getOrgId();
    set({ loading: true });
    const { data, error } = await supabase
      .from('tallas_config')
      .select('cliente_id, molde_id, talla, alto, ancho, manga_ancho, manga_alto')
      .eq('org_id', orgId);
    set({ loading: false });
    if (error) { errToast('tallas.init:', error); return; }

    const result: TallasPorCliente = {};
    for (const row of data ?? []) {
      if (!result[row.cliente_id]) result[row.cliente_id] = {};
      if (!result[row.cliente_id][row.molde_id]) result[row.cliente_id][row.molde_id] = {};
      result[row.cliente_id][row.molde_id][row.talla] = {
        ALTO:        row.alto,
        ANCHO:       row.ancho,
        MANGA_ANCHO: row.manga_ancho,
        MANGA_ALTO:  row.manga_alto,
      };
    }
    set({ tallasPorCliente: result });
  },

  // ── Lectura ───────────────────────────────────────────────────
  getTallas: (clienteId, moldeId) => {
    const raw = get().tallasPorCliente[clienteId]?.[moldeId] ?? {};
    const result: Record<string, TallaDims> = {};
    for (const [t, d] of Object.entries(raw)) {
      result[t] = normalizeDims(d);
    }
    return result;
  },

  // ── Mutations — optimistic ────────────────────────────────────
  setDim: (clienteId, moldeId, talla, field, value) => {
    const orgId  = getOrgId();
    const prev   = get().tallasPorCliente;
    const byMolde = prev[clienteId] ?? {};
    const byTalla = byMolde[moldeId] ?? {};
    const updated = { ...(byTalla[talla] ?? EMPTY_DIMS), [field]: value };
    set({
      tallasPorCliente: {
        ...prev,
        [clienteId]: { ...byMolde, [moldeId]: { ...byTalla, [talla]: updated } },
      },
    });
    supabase.from('tallas_config').upsert({
      org_id:      orgId,
      cliente_id:  clienteId,
      molde_id:    moldeId,
      talla,
      alto:        updated.ALTO,
      ancho:       updated.ANCHO,
      manga_ancho: updated.MANGA_ANCHO,
      manga_alto:  updated.MANGA_ALTO,
    }, { onConflict: 'org_id,cliente_id,molde_id,talla' })
      .then(({ error }) => {
        if (error) errToast('tallas.setDim:', error);
      });
    void DIM_COL; // usado por el tipo, evita lint warning
  },

  addTalla: (clienteId, moldeId, talla) => {
    const orgId = getOrgId();
    const t = talla.trim().toUpperCase();
    if (!t) return;
    const prev    = get().tallasPorCliente;
    const byMolde = prev[clienteId] ?? {};
    const byTalla = byMolde[moldeId] ?? {};
    if (byTalla[t]) return;
    set({
      tallasPorCliente: {
        ...prev,
        [clienteId]: { ...byMolde, [moldeId]: { ...byTalla, [t]: { ...EMPTY_DIMS } } },
      },
    });
    supabase.from('tallas_config').insert({
      org_id: orgId, cliente_id: clienteId, molde_id: moldeId, talla: t,
      alto: '', ancho: '', manga_ancho: '', manga_alto: '',
    }).then(({ error }) => {
      if (error) errToast('tallas.addTalla:', error);
    });
  },

  removeTalla: (clienteId, moldeId, talla) => {
    const orgId  = getOrgId();
    const prev   = get().tallasPorCliente;
    const byMolde = { ...(prev[clienteId] ?? {}) };
    const byTalla = { ...(byMolde[moldeId] ?? {}) };
    delete byTalla[talla];
    set({ tallasPorCliente: { ...prev, [clienteId]: { ...byMolde, [moldeId]: byTalla } } });
    supabase.from('tallas_config')
      .delete()
      .eq('org_id', orgId)
      .eq('cliente_id', clienteId)
      .eq('molde_id', moldeId)
      .eq('talla', talla)
      .then(({ error }) => {
        if (error) {
          errToast('tallas.removeTalla:', error);
          set({ tallasPorCliente: prev });
        }
      });
  },

  initClienteFromDefault: async (clienteId, moldeId) => {
    const orgId   = getOrgId();
    const prev    = get().tallasPorCliente;
    const byMolde = prev[clienteId] ?? {};
    const source  = useTallasDefaultStore.getState().getDefaults(moldeId);
    set({
      tallasPorCliente: {
        ...prev,
        [clienteId]: { ...byMolde, [moldeId]: { ...source } },
      },
    });
    const rows = Object.entries(source).map(([talla, dims]) => ({
      org_id: orgId, cliente_id: clienteId, molde_id: moldeId, talla,
      alto: dims.ALTO, ancho: dims.ANCHO, manga_ancho: dims.MANGA_ANCHO, manga_alto: dims.MANGA_ALTO,
    }));
    const { error: delErr } = await supabase.from('tallas_config')
      .delete()
      .eq('org_id', orgId)
      .eq('cliente_id', clienteId)
      .eq('molde_id', moldeId);
    if (delErr) { errToast('tallas.initDefault.delete:', delErr); set({ tallasPorCliente: prev }); return; }
    supabase.from('tallas_config')
      .insert(rows)
      .then(({ error }) => { if (error) { errToast('tallas.initDefault.insert:', error); set({ tallasPorCliente: prev }); } });
  },

  removeCliente: (clienteId) => {
    const orgId = getOrgId();
    const next  = { ...get().tallasPorCliente };
    delete next[clienteId];
    set({ tallasPorCliente: next });
    supabase.from('tallas_config')
      .delete().eq('org_id', orgId).eq('cliente_id', clienteId)
      .then(({ error }) => { if (error) errToast('tallas.removeCliente:', error); });
  },

  removeMoldeData: (moldeId) => {
    const orgId = getOrgId();
    const prev  = get().tallasPorCliente;
    const next: TallasPorCliente = {};
    for (const [cid, byMolde] of Object.entries(prev)) {
      const { [moldeId]: _removed, ...rest } = byMolde;
      next[cid] = rest;
    }
    set({ tallasPorCliente: next });
    supabase.from('tallas_config')
      .delete().eq('org_id', orgId).eq('molde_id', moldeId)
      .then(({ error }) => { if (error) errToast('tallas.removeMolde:', error); });
  },
}));
