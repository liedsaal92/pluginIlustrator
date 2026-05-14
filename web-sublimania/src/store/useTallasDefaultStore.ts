// ============================================================
//  store/useTallasDefaultStore.ts — Tallas por defecto por molde
//  Backed by Supabase (tabla tallas_default).
//  Estructura: moldeId → talla → dims
//  Se siembra con TALLAS_DEFAULT la primera vez para el molde camiseta.
// ============================================================
import { create } from 'zustand';
import { supabase } from '../utils/supabase';
import { useAuthStore } from './useAuthStore';
import { TALLAS_DEFAULT } from './tallasConstants';
import type { TallaDims } from '../types';

function getOrgId(): string {
  const orgId = useAuthStore.getState().session?.user.orgId;
  if (!orgId) throw new Error('No org_id — usuario no autenticado');
  return orgId;
}

type DefaultsByMolde = Record<string, Record<string, TallaDims>>;
type OrdenByMolde    = Record<string, string[]>;

interface TallasDefaultState {
  defaultsByMolde: DefaultsByMolde;
  ordenByMolde:    OrdenByMolde;
  loading:         boolean;

  init:           () => Promise<void>;
  getDefaults:    (moldeId: string) => Record<string, TallaDims>;
  getOrden:       (moldeId: string) => string[];
  addDefault:     (moldeId: string, talla: string, dims?: Partial<TallaDims>) => void;
  updateDefault:  (moldeId: string, talla: string, field: keyof TallaDims, value: string) => void;
  removeDefault:  (moldeId: string, talla: string) => void;
  resetToBuiltin: (moldeId: string, tipo: 'camiseta' | 'pantaloneta') => Promise<void>;
}

function buildSeedRows(orgId: string, moldeId: string, tipo: 'camiseta' | 'pantaloneta') {
  return Object.keys(TALLAS_DEFAULT).map((talla, i) => {
    const d = TALLAS_DEFAULT[talla];
    return {
      org_id:      orgId,
      molde_id:    moldeId,
      talla,
      alto:        tipo === 'camiseta' ? d.ALTO        : '',
      ancho:       tipo === 'camiseta' ? d.ANCHO       : '',
      manga_ancho: tipo === 'camiseta' ? d.MANGA_ANCHO : '',
      manga_alto:  tipo === 'camiseta' ? d.MANGA_ALTO  : '',
      orden:       i,
    };
  });
}

export const useTallasDefaultStore = create<TallasDefaultState>()((set, get) => ({
  defaultsByMolde: {},
  ordenByMolde:    {},
  loading:         false,

  init: async () => {
    const orgId = getOrgId();
    set({ loading: true });
    const { data, error } = await supabase
      .from('tallas_default')
      .select('molde_id, talla, alto, ancho, manga_ancho, manga_alto, orden')
      .eq('org_id', orgId)
      .order('molde_id').order('orden', { ascending: true });
    set({ loading: false });
    if (error) { console.error('tallasDefault.init:', error); return; }

    const byMolde: DefaultsByMolde = {};
    const orden:   OrdenByMolde    = {};

    if (!data || data.length === 0) {
      // Primera vez — sembrar molde camiseta por defecto
      const rows = buildSeedRows(orgId, 'camiseta', 'camiseta');
      const { error: seedErr } = await supabase.from('tallas_default').insert(rows);
      if (seedErr) { console.error('tallasDefault.seed:', seedErr); return; }
      byMolde['camiseta'] = {};
      orden['camiseta']   = [];
      for (const r of rows) {
        byMolde['camiseta'][r.talla] = {
          ALTO: r.alto, ANCHO: r.ancho, MANGA_ANCHO: r.manga_ancho, MANGA_ALTO: r.manga_alto,
        };
        orden['camiseta'].push(r.talla);
      }
      set({ defaultsByMolde: byMolde, ordenByMolde: orden });
      return;
    }

    for (const row of data) {
      const m = row.molde_id;
      if (!byMolde[m]) { byMolde[m] = {}; orden[m] = []; }
      byMolde[m][row.talla] = {
        ALTO: row.alto, ANCHO: row.ancho,
        MANGA_ANCHO: row.manga_ancho, MANGA_ALTO: row.manga_alto,
      };
      orden[m].push(row.talla);
    }
    set({ defaultsByMolde: byMolde, ordenByMolde: orden });
  },

  getDefaults: (moldeId) => get().defaultsByMolde[moldeId] ?? {},
  getOrden:    (moldeId) => get().ordenByMolde[moldeId]    ?? [],

  addDefault: (moldeId, talla, dims = {}) => {
    const orgId = getOrgId();
    const t     = talla.trim().toUpperCase();
    if (!t || get().defaultsByMolde[moldeId]?.[t]) return;
    const newDims: TallaDims = {
      ALTO: dims.ALTO ?? '', ANCHO: dims.ANCHO ?? '',
      MANGA_ANCHO: dims.MANGA_ANCHO ?? '', MANGA_ALTO: dims.MANGA_ALTO ?? '',
    };
    const nextOrden = (get().ordenByMolde[moldeId] ?? []).length;
    set(s => ({
      defaultsByMolde: {
        ...s.defaultsByMolde,
        [moldeId]: { ...(s.defaultsByMolde[moldeId] ?? {}), [t]: newDims },
      },
      ordenByMolde: {
        ...s.ordenByMolde,
        [moldeId]: [...(s.ordenByMolde[moldeId] ?? []), t],
      },
    }));
    supabase.from('tallas_default').insert({
      org_id: orgId, molde_id: moldeId, talla: t,
      alto: newDims.ALTO, ancho: newDims.ANCHO,
      manga_ancho: newDims.MANGA_ANCHO, manga_alto: newDims.MANGA_ALTO,
      orden: nextOrden,
    }).then(({ error }) => { if (error) console.error('tallasDefault.add:', error); });
  },

  updateDefault: (moldeId, talla, field, value) => {
    const orgId = getOrgId();
    const prev  = get().defaultsByMolde[moldeId];
    if (!prev?.[talla]) return;
    const updated = { ...prev[talla], [field]: value };
    set(s => ({
      defaultsByMolde: {
        ...s.defaultsByMolde,
        [moldeId]: { ...s.defaultsByMolde[moldeId], [talla]: updated },
      },
    }));
    const colMap: Record<keyof TallaDims, string> = {
      ALTO: 'alto', ANCHO: 'ancho', MANGA_ANCHO: 'manga_ancho', MANGA_ALTO: 'manga_alto',
    };
    supabase.from('tallas_default')
      .update({ [colMap[field]]: value })
      .eq('org_id', orgId).eq('molde_id', moldeId).eq('talla', talla)
      .then(({ error }) => { if (error) console.error('tallasDefault.update:', error); });
  },

  removeDefault: (moldeId, talla) => {
    const orgId     = getOrgId();
    const prevAll   = get().defaultsByMolde;
    const prevOrden = get().ordenByMolde;
    const { [talla]: _r, ...rest } = prevAll[moldeId] ?? {};
    set(s => ({
      defaultsByMolde: { ...s.defaultsByMolde, [moldeId]: rest },
      ordenByMolde:    { ...s.ordenByMolde,    [moldeId]: (prevOrden[moldeId] ?? []).filter(t => t !== talla) },
    }));
    supabase.from('tallas_default')
      .delete().eq('org_id', orgId).eq('molde_id', moldeId).eq('talla', talla)
      .then(({ error }) => {
        if (error) {
          console.error('tallasDefault.remove:', error);
          set({ defaultsByMolde: prevAll, ordenByMolde: prevOrden });
        }
      });
  },

  resetToBuiltin: async (moldeId, tipo) => {
    const orgId = getOrgId();
    const rows  = buildSeedRows(orgId, moldeId, tipo);
    const byMolde: Record<string, TallaDims> = {};
    const orden: string[] = [];
    for (const r of rows) {
      byMolde[r.talla] = { ALTO: r.alto, ANCHO: r.ancho, MANGA_ANCHO: r.manga_ancho, MANGA_ALTO: r.manga_alto };
      orden.push(r.talla);
    }
    set(s => ({
      defaultsByMolde: { ...s.defaultsByMolde, [moldeId]: byMolde },
      ordenByMolde:    { ...s.ordenByMolde,    [moldeId]: orden   },
    }));
    await supabase.from('tallas_default').delete().eq('org_id', orgId).eq('molde_id', moldeId);
    supabase.from('tallas_default').insert(rows)
      .then(({ error }) => { if (error) console.error('tallasDefault.resetInsert:', error); });
  },
}));
