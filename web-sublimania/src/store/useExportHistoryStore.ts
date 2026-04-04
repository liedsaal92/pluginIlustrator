// ============================================================
//  store/useExportHistoryStore.ts
//  Historial de exportaciones por equipo → talla
//  Persistido en localStorage bajo "sublimania_export_history"
// ============================================================
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TallaExport {
  exportedAt: string; // ISO timestamp
}

// { [equipo]: { [talla]: TallaExport } }
type History = Record<string, Record<string, TallaExport>>;

interface ExportHistoryState {
  history: History;
  markExported: (equipo: string, tallas: string[]) => void;
  getTeamHistory: (equipo: string) => Record<string, TallaExport>;
}

export const useExportHistoryStore = create<ExportHistoryState>()(
  persist(
    (set, get) => ({
      history: {},

      markExported: (equipo, tallas) => {
        const now = new Date().toISOString();
        set((state) => {
          const teamHistory = { ...(state.history[equipo] ?? {}) };
          tallas.forEach((t) => {
            teamHistory[t] = { exportedAt: now };
          });
          return { history: { ...state.history, [equipo]: teamHistory } };
        });
      },

      getTeamHistory: (equipo) => {
        return get().history[equipo] ?? {};
      },
    }),
    { name: 'sublimania_export_history' },
  ),
);
