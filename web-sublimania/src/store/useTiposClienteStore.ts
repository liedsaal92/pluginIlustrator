// ============================================================
//  store/useTiposClienteStore.ts — Tipos de cliente
//  Backed by Supabase. Optimistic updates — UI responde instantáneo.
//  Llamar init() después de que la sesión esté disponible.
// ============================================================
import { create } from 'zustand';
import { supabase } from '../utils/supabase';
import { useAuthStore } from './useAuthStore';
import type { TipoCliente } from '../types';
import type { CustomerSegment } from '../pricing/types';

const SEED: TipoCliente[] = [
  { id: 'tipo_normal', nombre: 'NORMAL', segmento: 'normal' },
  { id: 'tipo_vip',    nombre: 'VIP',    segmento: 'vip'    },
];

function getOrgId(): string {
  const orgId = useAuthStore.getState().session?.user.orgId;
  if (!orgId) throw new Error('No org_id — usuario no autenticado');
  return orgId;
}

interface TiposClienteStore {
  tipos: TipoCliente[];
  clienteTipos: Record<string, string>;
  loading: boolean;

  init: () => Promise<void>;
  addTipo: (nombre: string, segmento: CustomerSegment) => void;
  updateTipo: (id: string, patch: Partial<Omit<TipoCliente, 'id'>>) => void;
  removeTipo: (id: string) => void;
  assignTipo: (clienteId: string, tipoId: string) => void;
  unassignTipo: (clienteId: string) => void;
  getSegmentoForCliente: (clienteId: string) => CustomerSegment;
}

export const useTiposClienteStore = create<TiposClienteStore>((set, get) => ({
  tipos:        SEED,
  clienteTipos: {},
  loading:      false,

  // ── Carga inicial desde Supabase ─────────────────────────────
  init: async () => {
    const orgId = getOrgId();
    set({ loading: true });

    const [tiposRes, asignacionesRes] = await Promise.all([
      supabase.from('pricing_tipos_cliente').select('*').eq('org_id', orgId).order('sort_order'),
      supabase.from('pricing_cliente_tipos').select('cliente_id, tipo_id').eq('org_id', orgId),
    ]);

    set({ loading: false });

    // Org nueva sin tipos → seed
    if (!tiposRes.data || tiposRes.data.length === 0) {
      await supabase.from('pricing_tipos_cliente').insert(
        SEED.map((t, i) => ({ id: t.id, org_id: orgId, nombre: t.nombre, segmento: t.segmento, sort_order: i }))
      );
      set({ tipos: SEED, clienteTipos: {} });
      return;
    }

    const tipos: TipoCliente[] = tiposRes.data.map(r => ({
      id: r.id, nombre: r.nombre, segmento: r.segmento as CustomerSegment,
    }));
    const clienteTipos: Record<string, string> = {};
    for (const r of (asignacionesRes.data ?? [])) {
      clienteTipos[r.cliente_id] = r.tipo_id;
    }

    set({ tipos, clienteTipos });
  },

  // ── Mutations — optimistic ────────────────────────────────────
  addTipo: (nombre, segmento) => {
    const orgId = getOrgId();
    const id = `tipo_${Date.now()}`;
    const tipo: TipoCliente = { id, nombre: nombre.trim().toUpperCase(), segmento };
    const sortOrder = get().tipos.length;
    set(s => ({ tipos: [...s.tipos, tipo] }));
    supabase.from('pricing_tipos_cliente').insert({ id, org_id: orgId, nombre: tipo.nombre, segmento, sort_order: sortOrder })
      .then(({ error }) => {
        if (error) { console.error('tipos_cliente.add:', error); set(s => ({ tipos: s.tipos.filter(t => t.id !== id) })); }
      });
  },

  updateTipo: (id, patch) => {
    const orgId = getOrgId();
    const prev = get().tipos;
    const tipos = prev.map(t =>
      t.id === id ? { ...t, ...patch, nombre: (patch.nombre ?? t.nombre).toUpperCase() } : t
    );
    set({ tipos });
    const dbPatch: Record<string, unknown> = {};
    if (patch.nombre   !== undefined) dbPatch.nombre   = patch.nombre.toUpperCase();
    if (patch.segmento !== undefined) dbPatch.segmento = patch.segmento;
    supabase.from('pricing_tipos_cliente').update(dbPatch).eq('id', id).eq('org_id', orgId)
      .then(({ error }) => { if (error) { console.error('tipos_cliente.update:', error); set({ tipos: prev }); } });
  },

  removeTipo: (id) => {
    const orgId = getOrgId();
    const prevTipos = get().tipos;
    const prevClienteTipos = get().clienteTipos;
    const clienteTipos = Object.fromEntries(
      Object.entries(prevClienteTipos).filter(([, tipoId]) => tipoId !== id)
    );
    set(s => ({ tipos: s.tipos.filter(t => t.id !== id), clienteTipos }));
    // Borrar asignaciones primero, luego el tipo
    supabase.from('pricing_cliente_tipos').delete().eq('tipo_id', id).eq('org_id', orgId)
      .then(() =>
        supabase.from('pricing_tipos_cliente').delete().eq('id', id).eq('org_id', orgId)
      ).then(({ error }) => {
        if (error) { console.error('tipos_cliente.remove:', error); set({ tipos: prevTipos, clienteTipos: prevClienteTipos }); }
      });
  },

  assignTipo: (clienteId, tipoId) => {
    const orgId = getOrgId();
    const prev = get().clienteTipos;
    set(s => ({ clienteTipos: { ...s.clienteTipos, [clienteId]: tipoId } }));
    supabase.from('pricing_cliente_tipos').upsert({ cliente_id: clienteId, org_id: orgId, tipo_id: tipoId })
      .then(({ error }) => { if (error) { console.error('cliente_tipos.assign:', error); set({ clienteTipos: prev }); } });
  },

  unassignTipo: (clienteId) => {
    const orgId = getOrgId();
    const prev = get().clienteTipos;
    set(s => {
      const clienteTipos = { ...s.clienteTipos };
      delete clienteTipos[clienteId];
      return { clienteTipos };
    });
    supabase.from('pricing_cliente_tipos').delete().eq('cliente_id', clienteId).eq('org_id', orgId)
      .then(({ error }) => { if (error) { console.error('cliente_tipos.unassign:', error); set({ clienteTipos: prev }); } });
  },

  getSegmentoForCliente: (clienteId) => {
    const { tipos, clienteTipos } = get();
    const tipoId = clienteTipos[clienteId];
    if (!tipoId) return 'normal';
    return tipos.find(t => t.id === tipoId)?.segmento ?? 'normal';
  },
}));
