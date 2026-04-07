// ============================================================
//  store/useTallasStore.ts — Dimensiones de tallas por cliente
//  Estructura: clienteId → tallaNombre → TallaDims
//  Global, persiste en localStorage como "sublimania_tallas_v2"
// ============================================================
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TallaDims } from '../types';

export const TALLAS_DEFAULT: Record<string, TallaDims> = {
  // ── Hombres ──────────────────────────────────────────────
  '24H': { ALTO: '47.5',  ANCHO: '35',    MANGA_ANCHO: '29',   MANGA_ALTO: '16.5' },
  '26H': { ALTO: '51',    ANCHO: '37',    MANGA_ANCHO: '31',   MANGA_ALTO: '17.5' },
  '28H': { ALTO: '55',    ANCHO: '39',    MANGA_ANCHO: '33',   MANGA_ALTO: '18'   },
  '30H': { ALTO: '59.5',  ANCHO: '40',    MANGA_ANCHO: '31.5', MANGA_ALTO: '20'   },
  '32H': { ALTO: '65',    ANCHO: '45',    MANGA_ANCHO: '37.5', MANGA_ALTO: '22'   },
  '34H': { ALTO: '71',    ANCHO: '47.5',  MANGA_ANCHO: '39',   MANGA_ALTO: '24.5' },
  '35H': { ALTO: '74.5',  ANCHO: '50',    MANGA_ANCHO: '41',   MANGA_ALTO: '26'   },
  '36H': { ALTO: '76',    ANCHO: '52',    MANGA_ANCHO: '44.5', MANGA_ALTO: '27.5' },
  '38H': { ALTO: '79.5',  ANCHO: '55',    MANGA_ANCHO: '46',   MANGA_ALTO: '28.5' },
  '40H': { ALTO: '82',    ANCHO: '58',    MANGA_ANCHO: '48',   MANGA_ALTO: '29.5' },
  '42H': { ALTO: '86.5',  ANCHO: '61',    MANGA_ANCHO: '50.5', MANGA_ALTO: '31.5' },
  '44H': { ALTO: '89.5',  ANCHO: '65.5',  MANGA_ANCHO: '52.5', MANGA_ALTO: '32.5' },
  // ── Mujeres ──────────────────────────────────────────────
  '24M': { ALTO: '45.5',  ANCHO: '35',    MANGA_ANCHO: '26.5', MANGA_ALTO: '15'   },
  '26M': { ALTO: '49.5',  ANCHO: '37',    MANGA_ANCHO: '29',   MANGA_ALTO: '16'   },
  '28M': { ALTO: '53',    ANCHO: '38',    MANGA_ANCHO: '29',   MANGA_ALTO: '16.5' },
  '30M': { ALTO: '56.5',  ANCHO: '41',    MANGA_ANCHO: '30.5', MANGA_ALTO: '18'   },
  '32M': { ALTO: '62',    ANCHO: '45',    MANGA_ANCHO: '35.5', MANGA_ALTO: '20'   },
  '34M': { ALTO: '65',    ANCHO: '46.5',  MANGA_ANCHO: '38',   MANGA_ALTO: '21.5' },
  '35M': { ALTO: '69',    ANCHO: '49.5',  MANGA_ANCHO: '39.5', MANGA_ALTO: '22.5' },
  '36M': { ALTO: '67.5',  ANCHO: '52',    MANGA_ANCHO: '40',   MANGA_ALTO: '22.5' },
  '38M': { ALTO: '70.5',  ANCHO: '53',    MANGA_ANCHO: '40',   MANGA_ALTO: '23.5' },
  '40M': { ALTO: '75',    ANCHO: '55',    MANGA_ANCHO: '43',   MANGA_ALTO: '24'   },
  '42M': { ALTO: '76.5',  ANCHO: '57',    MANGA_ANCHO: '46',   MANGA_ALTO: '25.5' },
  '44M': { ALTO: '80.5',  ANCHO: '62.5',  MANGA_ANCHO: '49',   MANGA_ALTO: '27'   },
};

const EMPTY_DIMS: TallaDims = { ALTO: '', ANCHO: '', MANGA_ANCHO: '', MANGA_ALTO: '' };

interface TallasState {
  // clienteId → tallaNombre → TallaDims
  tallasPorCliente: Record<string, Record<string, TallaDims>>;

  getTallas:              (clienteId: string) => Record<string, TallaDims>;
  setDim:                 (clienteId: string, talla: string, field: keyof TallaDims, value: string) => void;
  addTalla:               (clienteId: string, talla: string) => void;
  removeTalla:            (clienteId: string, talla: string) => void;
  initClienteFromDefault: (clienteId: string) => void;
  removeCliente:          (clienteId: string) => void;
}

export const useTallasStore = create<TallasState>()(
  persist(
    (set, get) => ({
      tallasPorCliente: {},

      getTallas: (clienteId) => get().tallasPorCliente[clienteId] ?? {},

      setDim: (clienteId, talla, field, value) => {
        const prev = get().tallasPorCliente;
        const clienteTallas = prev[clienteId] ?? {};
        set({
          tallasPorCliente: {
            ...prev,
            [clienteId]: {
              ...clienteTallas,
              [talla]: { ...(clienteTallas[talla] ?? EMPTY_DIMS), [field]: value },
            },
          },
        });
      },

      addTalla: (clienteId, talla) => {
        const t = talla.trim().toUpperCase();
        if (!t) return;
        const prev = get().tallasPorCliente;
        const clienteTallas = prev[clienteId] ?? {};
        if (clienteTallas[t]) return; // ya existe
        set({
          tallasPorCliente: {
            ...prev,
            [clienteId]: { ...clienteTallas, [t]: { ...EMPTY_DIMS } },
          },
        });
      },

      removeTalla: (clienteId, talla) => {
        const prev = get().tallasPorCliente;
        const clienteTallas = { ...(prev[clienteId] ?? {}) };
        delete clienteTallas[talla];
        set({ tallasPorCliente: { ...prev, [clienteId]: clienteTallas } });
      },

      initClienteFromDefault: (clienteId) => {
        const prev = get().tallasPorCliente;
        set({
          tallasPorCliente: {
            ...prev,
            [clienteId]: { ...TALLAS_DEFAULT },
          },
        });
      },

      removeCliente: (clienteId) => {
        const next = { ...get().tallasPorCliente };
        delete next[clienteId];
        set({ tallasPorCliente: next });
      },
    }),
    { name: 'sublimania_tallas_v2' }
  )
);
