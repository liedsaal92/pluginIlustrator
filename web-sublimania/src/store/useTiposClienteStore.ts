import { create } from 'zustand';
import type { TipoCliente } from '../types';
import type { CustomerSegment } from '../pricing/types';

const TIPOS_KEY   = 'subliflow_tipos_cliente';
const ASIGNACIONES_KEY = 'subliflow_cliente_tipos';

const SEED: TipoCliente[] = [
  { id: 'tipo_normal', nombre: 'NORMAL', segmento: 'normal' },
  { id: 'tipo_vip',    nombre: 'VIP',    segmento: 'vip'    },
];

function loadTipos(): TipoCliente[] {
  const raw = localStorage.getItem(TIPOS_KEY);
  if (raw === null) return SEED;
  try { return JSON.parse(raw); } catch { return SEED; }
}

function loadAsignaciones(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(ASIGNACIONES_KEY) ?? '{}'); } catch { return {}; }
}

interface TiposClienteStore {
  tipos: TipoCliente[];
  clienteTipos: Record<string, string>;

  addTipo(nombre: string, segmento: CustomerSegment): void;
  updateTipo(id: string, patch: Partial<Omit<TipoCliente, 'id'>>): void;
  removeTipo(id: string): void;
  assignTipo(clienteId: string, tipoId: string): void;
  unassignTipo(clienteId: string): void;
  getSegmentoForCliente(clienteId: string): CustomerSegment;
}

export const useTiposClienteStore = create<TiposClienteStore>((set, get) => ({
  tipos: loadTipos(),
  clienteTipos: loadAsignaciones(),

  addTipo(nombre, segmento) {
    const tipo: TipoCliente = {
      id: `tipo_${Date.now()}`,
      nombre: nombre.trim().toUpperCase(),
      segmento,
    };
    set(s => {
      const tipos = [...s.tipos, tipo];
      localStorage.setItem(TIPOS_KEY, JSON.stringify(tipos));
      return { tipos };
    });
  },

  updateTipo(id, patch) {
    set(s => {
      const tipos = s.tipos.map(t => t.id === id ? { ...t, ...patch, nombre: (patch.nombre ?? t.nombre).toUpperCase() } : t);
      localStorage.setItem(TIPOS_KEY, JSON.stringify(tipos));
      return { tipos };
    });
  },

  removeTipo(id) {
    set(s => {
      const tipos = s.tipos.filter(t => t.id !== id);
      const clienteTipos = Object.fromEntries(
        Object.entries(s.clienteTipos).filter(([, tipoId]) => tipoId !== id)
      );
      localStorage.setItem(TIPOS_KEY, JSON.stringify(tipos));
      localStorage.setItem(ASIGNACIONES_KEY, JSON.stringify(clienteTipos));
      return { tipos, clienteTipos };
    });
  },

  assignTipo(clienteId, tipoId) {
    set(s => {
      const clienteTipos = { ...s.clienteTipos, [clienteId]: tipoId };
      localStorage.setItem(ASIGNACIONES_KEY, JSON.stringify(clienteTipos));
      return { clienteTipos };
    });
  },

  unassignTipo(clienteId) {
    set(s => {
      const clienteTipos = { ...s.clienteTipos };
      delete clienteTipos[clienteId];
      localStorage.setItem(ASIGNACIONES_KEY, JSON.stringify(clienteTipos));
      return { clienteTipos };
    });
  },

  getSegmentoForCliente(clienteId) {
    const { tipos, clienteTipos } = get();
    const tipoId = clienteTipos[clienteId];
    if (!tipoId) return 'normal';
    return tipos.find(t => t.id === tipoId)?.segmento ?? 'normal';
  },
}));
