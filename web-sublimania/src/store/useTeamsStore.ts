// ============================================================
//  store/useTeamsStore.ts — Master store de todos los equipos
//  Persistido en localStorage como "sublimania_teams_v1"
// ============================================================
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TeamEntry } from '../types';

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

interface TeamsState {
  teams: TeamEntry[];
  activeTeamId: string | null;

  // Devuelve el equipo activo o null
  getActiveTeam: () => TeamEntry | null;

  // Crea un equipo nuevo, lo activa y devuelve su id
  createTeam: (data: Omit<TeamEntry, 'id' | 'createdAt' | 'updatedAt'>) => string;

  // Guarda (sobreescribe) el estado de un equipo existente
  saveTeam: (id: string, data: Omit<TeamEntry, 'id' | 'createdAt' | 'updatedAt'>) => void;

  // Cambia el equipo activo (sin tocar el working store — lo maneja el caller)
  switchTeam: (id: string) => void;

  // Elimina un equipo; activa el siguiente disponible
  deleteTeam: (id: string) => void;

  // Registra tallas exportadas en el historial del equipo activo
  markExported: (id: string, tallas: string[]) => void;

  // Reemplaza toda la lista (importación de respaldo)
  replaceAll: (teams: TeamEntry[]) => void;
}

export const useTeamsStore = create<TeamsState>()(
  persist(
    (set, get) => ({
      teams: [],
      activeTeamId: null,

      getActiveTeam: () => {
        const { teams, activeTeamId } = get();
        return teams.find(t => t.id === activeTeamId) ?? null;
      },

      createTeam: (data) => {
        const id = generateId();
        const now = new Date().toISOString();
        const entry: TeamEntry = { id, createdAt: now, updatedAt: now, ...data };
        set(state => ({ teams: [...state.teams, entry], activeTeamId: id }));
        return id;
      },

      saveTeam: (id, data) => {
        set(state => ({
          teams: state.teams.map(t =>
            t.id === id
              ? { ...t, ...data, updatedAt: new Date().toISOString() }
              : t
          ),
        }));
      },

      switchTeam: (id) => set({ activeTeamId: id }),

      deleteTeam: (id) => {
        set(state => {
          const teams = state.teams.filter(t => t.id !== id);
          const activeTeamId =
            state.activeTeamId === id ? (teams[0]?.id ?? null) : state.activeTeamId;
          return { teams, activeTeamId };
        });
      },

      markExported: (id, tallas) => {
        const now = new Date().toISOString();
        set(state => ({
          teams: state.teams.map(t =>
            t.id === id
              ? {
                  ...t,
                  exportHistory: {
                    ...t.exportHistory,
                    ...Object.fromEntries(tallas.map(talla => [talla, { exportedAt: now }])),
                  },
                }
              : t
          ),
        }));
      },

      replaceAll: (teams) => {
        set({ teams, activeTeamId: teams[0]?.id ?? null });
      },
    }),
    { name: 'sublimania_teams_v1' },
  ),
);
