// ============================================================
//  store/useClientesStore.ts — Clientes / casas costurera
//  Global, persiste en localStorage como "sublimania_clientes_v1"
// ============================================================
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Cliente } from '../types';

function generateId(): string {
  return 'c_' + Math.random().toString(36).slice(2, 10);
}

interface ClientesState {
  clientes: Cliente[];
  addCliente: (nombre: string, casaCosturera: string) => string;
  updateCliente: (id: string, fields: Partial<Omit<Cliente, 'id'>>) => void;
  removeCliente: (id: string) => void;
  getCliente: (id: string) => Cliente | undefined;
}

export const useClientesStore = create<ClientesState>()(
  persist(
    (set, get) => ({
      clientes: [],

      addCliente: (nombre, casaCosturera) => {
        const id = generateId();
        set(s => ({ clientes: [...s.clientes, { id, nombre: nombre.trim(), casaCosturera: casaCosturera.trim() }] }));
        return id;
      },

      updateCliente: (id, fields) => {
        set(s => ({
          clientes: s.clientes.map(c => c.id === id ? { ...c, ...fields } : c),
        }));
      },

      removeCliente: (id) => {
        set(s => ({ clientes: s.clientes.filter(c => c.id !== id) }));
      },

      getCliente: (id) => get().clientes.find(c => c.id === id),
    }),
    { name: 'sublimania_clientes_v1' }
  )
);
