// ============================================================
//  store/useClientesStore.ts — Clientes / casas costurera
//  Backed by Supabase. Optimistic updates — UI responde instantáneo.
//  Llamar init() después de que la sesión esté disponible.
// ============================================================
import { create } from 'zustand';
import { supabase } from '../utils/supabase';
import { useAuthStore } from './useAuthStore';
import type { Cliente } from '../types';

function generateId(): string {
  return 'c_' + Math.random().toString(36).slice(2, 10);
}

function getOrgId(): string {
  const orgId = useAuthStore.getState().session?.user.orgId;
  if (!orgId) throw new Error('No org_id — usuario no autenticado');
  return orgId;
}

interface ClientesState {
  clientes: Cliente[];
  loading:  boolean;
  init:          () => Promise<void>;
  addCliente:    (nombre: string, casaCosturera: string) => string;
  updateCliente: (id: string, fields: Partial<Omit<Cliente, 'id'>>) => void;
  removeCliente: (id: string) => void;
  getCliente:    (id: string) => Cliente | undefined;
}

export const useClientesStore = create<ClientesState>()((set, get) => ({
  clientes: [],
  loading:  false,

  // ── Carga inicial desde Supabase ─────────────────────────────
  init: async () => {
    const orgId = getOrgId();
    set({ loading: true });
    const { data, error } = await supabase
      .from('clientes')
      .select('id, nombre, casa_costurera')
      .eq('org_id', orgId)
      .order('created_at');
    set({ loading: false });
    if (error) { console.error('clientes.init:', error); return; }
    set({
      clientes: (data ?? []).map(r => ({
        id:            r.id,
        nombre:        r.nombre,
        casaCosturera: r.casa_costurera,
      })),
    });
  },

  // ── Mutations — optimistic ────────────────────────────────────
  addCliente: (nombre, casaCosturera) => {
    const id    = generateId();
    const orgId = getOrgId();
    set(s => ({ clientes: [...s.clientes, { id, nombre: nombre.trim(), casaCosturera: casaCosturera.trim() }] }));
    supabase.from('clientes').insert({
      id,
      org_id:         orgId,
      nombre:         nombre.trim(),
      casa_costurera: casaCosturera.trim(),
    }).then(({ error }) => {
      if (error) {
        console.error('clientes.add:', error);
        set(s => ({ clientes: s.clientes.filter(c => c.id !== id) }));
      }
    });
    return id;
  },

  updateCliente: (id, fields) => {
    const prev = get().clientes;
    set(s => ({ clientes: s.clientes.map(c => c.id === id ? { ...c, ...fields } : c) }));
    const update: Record<string, string> = {};
    if (fields.nombre         !== undefined) update.nombre         = fields.nombre;
    if (fields.casaCosturera  !== undefined) update.casa_costurera = fields.casaCosturera;
    supabase.from('clientes').update(update).eq('id', id).then(({ error }) => {
      if (error) { console.error('clientes.update:', error); set({ clientes: prev }); }
    });
  },

  removeCliente: (id) => {
    const prev = get().clientes;
    set(s => ({ clientes: s.clientes.filter(c => c.id !== id) }));
    supabase.from('clientes').delete().eq('id', id).then(({ error }) => {
      if (error) { console.error('clientes.remove:', error); set({ clientes: prev }); }
    });
  },

  getCliente: (id) => get().clientes.find(c => c.id === id),
}));
