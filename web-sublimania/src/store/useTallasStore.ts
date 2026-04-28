// ============================================================
//  store/useTallasStore.ts — Dimensiones de tallas
//  Estructura: clienteId → moldeId → tallaNombre → TallaDims
//  Backed by Supabase (tabla tallas_config).
// ============================================================
import { create } from 'zustand';
import { supabase } from '../utils/supabase';
import { useAuthStore } from './useAuthStore';
import type { TallaDims } from '../types';
export { MOLDE_DEFAULT_ID } from './useMoldesStore';

export const TALLAS_DEFAULT: Record<string, TallaDims> = {
  // ── Hombres ──────────────────────────────────────────────
  '24H': { ALTO: '47.5',  ANCHO: '35',    MANGA_ANCHO: '31',   MANGA_ALTO: '18'   },
  '26H': { ALTO: '51',    ANCHO: '37',    MANGA_ANCHO: '33',   MANGA_ALTO: '18.5' },
  '28H': { ALTO: '55',    ANCHO: '39',    MANGA_ANCHO: '35',   MANGA_ALTO: '19'   },
  '30H': { ALTO: '59.5',  ANCHO: '40',    MANGA_ANCHO: '33.5', MANGA_ALTO: '21'   },
  '32H': { ALTO: '65',    ANCHO: '45',    MANGA_ANCHO: '39.5', MANGA_ALTO: '23'   },
  '34H': { ALTO: '71',    ANCHO: '47.5',  MANGA_ANCHO: '41',   MANGA_ALTO: '25.5' },
  '35H': { ALTO: '74.5',  ANCHO: '50',    MANGA_ANCHO: '43',   MANGA_ALTO: '27'   },
  '36H': { ALTO: '76',    ANCHO: '52',    MANGA_ANCHO: '46.5', MANGA_ALTO: '28.5' },
  '38H': { ALTO: '79.5',  ANCHO: '55',    MANGA_ANCHO: '48',   MANGA_ALTO: '29.5' },
  '40H': { ALTO: '82',    ANCHO: '58',    MANGA_ANCHO: '50',   MANGA_ALTO: '30.5' },
  '42H': { ALTO: '86.5',  ANCHO: '61',    MANGA_ANCHO: '52.5', MANGA_ALTO: '32.5' },
  '44H': { ALTO: '89.5',  ANCHO: '65.5',  MANGA_ANCHO: '54.5', MANGA_ALTO: '33.5' },
  // ── Mujeres ──────────────────────────────────────────────
  '24M': { ALTO: '45.5',  ANCHO: '35',    MANGA_ANCHO: '28.5', MANGA_ALTO: '16'   },
  '26M': { ALTO: '49.5',  ANCHO: '37',    MANGA_ANCHO: '31',   MANGA_ALTO: '17'   },
  '28M': { ALTO: '53',    ANCHO: '38',    MANGA_ANCHO: '31.5', MANGA_ALTO: '17.5' },
  '30M': { ALTO: '56.5',  ANCHO: '41',    MANGA_ANCHO: '32.5', MANGA_ALTO: '18.5' },
  '32M': { ALTO: '62',    ANCHO: '45',    MANGA_ANCHO: '37.5', MANGA_ALTO: '21'   },
  '34M': { ALTO: '65',    ANCHO: '46.5',  MANGA_ANCHO: '40',   MANGA_ALTO: '22.5' },
  '35M': { ALTO: '69',    ANCHO: '49.5',  MANGA_ANCHO: '41.5', MANGA_ALTO: '23.5' },
  '36M': { ALTO: '67.5',  ANCHO: '52',    MANGA_ANCHO: '42',   MANGA_ALTO: '23.5' },
  '38M': { ALTO: '70.5',  ANCHO: '53',    MANGA_ANCHO: '42',   MANGA_ALTO: '24.5' },
  '40M': { ALTO: '75',    ANCHO: '55',    MANGA_ANCHO: '45',   MANGA_ALTO: '25'   },
  '42M': { ALTO: '76.5',  ANCHO: '57',    MANGA_ANCHO: '48',   MANGA_ALTO: '26.5' },
  '44M': { ALTO: '80.5',  ANCHO: '62.5',  MANGA_ANCHO: '51',   MANGA_ALTO: '28'   },
};

export const TALLAS_BASE_EMPTY: Record<string, TallaDims> = Object.fromEntries(
  Object.keys(TALLAS_DEFAULT).map(t => [t, { ALTO: '', ANCHO: '', MANGA_ANCHO: '', MANGA_ALTO: '' }])
);

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
  initClienteFromDefault: (clienteId: string, moldeId: string) => void;
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
    if (error) { console.error('tallas.init:', error); return; }

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
    const merged: Record<string, TallaDims> = { ...TALLAS_BASE_EMPTY };
    for (const [t, d] of Object.entries(raw)) {
      merged[t] = normalizeDims(d);
    }
    return merged;
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
        if (error) console.error('tallas.setDim:', error);
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
      if (error) console.error('tallas.addTalla:', error);
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
      .then(({ error }) => { if (error) console.error('tallas.removeTalla:', error); });
  },

  initClienteFromDefault: (clienteId, moldeId) => {
    const orgId  = getOrgId();
    const prev   = get().tallasPorCliente;
    const byMolde = prev[clienteId] ?? {};
    set({
      tallasPorCliente: {
        ...prev,
        [clienteId]: { ...byMolde, [moldeId]: { ...TALLAS_DEFAULT } },
      },
    });
    const rows = Object.entries(TALLAS_DEFAULT).map(([talla, dims]) => ({
      org_id: orgId, cliente_id: clienteId, molde_id: moldeId, talla,
      alto: dims.ALTO, ancho: dims.ANCHO, manga_ancho: dims.MANGA_ANCHO, manga_alto: dims.MANGA_ALTO,
    }));
    supabase.from('tallas_config')
      .upsert(rows, { onConflict: 'org_id,cliente_id,molde_id,talla' })
      .then(({ error }) => { if (error) console.error('tallas.initDefault:', error); });
  },

  removeCliente: (clienteId) => {
    const orgId = getOrgId();
    const next  = { ...get().tallasPorCliente };
    delete next[clienteId];
    set({ tallasPorCliente: next });
    supabase.from('tallas_config')
      .delete().eq('org_id', orgId).eq('cliente_id', clienteId)
      .then(({ error }) => { if (error) console.error('tallas.removeCliente:', error); });
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
      .then(({ error }) => { if (error) console.error('tallas.removeMolde:', error); });
  },
}));
