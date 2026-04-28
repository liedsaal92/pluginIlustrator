// ============================================================
//  store/useTeamStore.ts — Working store del equipo activo
// ============================================================
import { create } from 'zustand';
import type { Player, Rules, Overrides, GlobalConfig, Screen, ConfigTab, PiezaKey, TeamEntry } from '../types';
import { buildEmptyRules, getDefaultGlobal } from '../utils/schema';

interface TeamState {
  // Datos
  players: Player[];
  tallas: string[];
  tallaRules: Record<string, Rules>;
  overrides: Overrides;
  globalConfig: GlobalConfig;

  // Navegación
  screen: Screen;
  configTab: ConfigTab;
  activeTalla: string | null;
  activePieza: PiezaKey;
  expandedPlayer: number | null;
  expandedPlayerPieza: PiezaKey;

  // Acciones — datos
  setPlayers: (players: Player[], tallas: string[]) => void;
  addPlayer: (player: Player) => void;
  removePlayer: (idx: number) => void;
  updatePlayer: (idx: number, fields: Partial<Player>) => void;
  setTallaRule: (talla: string, key: string, value: string) => void;
  setOverride: (idx: number, key: string, value: string) => void;
  clearOverride: (idx: number) => void;
  applyTallaToAll: (talla: string) => void;
  copyTallaRules: (from: string, to: string) => void;
  copyTallaRulesToAll: (from: string) => void;
  importAllTallaRules: (rules: Record<string, Rules>) => void;
  setGlobalConfig: (key: string, value: string) => void;

  // Acciones — navegación
  setScreen: (screen: Screen) => void;
  setConfigTab: (tab: ConfigTab) => void;
  setActiveTalla: (talla: string) => void;
  setActivePieza: (pieza: PiezaKey) => void;
  setExpandedPlayer: (idx: number | null) => void;
  setExpandedPlayerPieza: (pieza: PiezaKey) => void;

  // Getters
  getPlayerRules: (idx: number) => Rules;
  hasOverride: (idx: number) => boolean;

  // Carga el estado completo desde un TeamEntry (al cambiar de equipo)
  loadFromEntry: (entry: TeamEntry, targetScreen?: Screen) => void;
}

export const useTeamStore = create<TeamState>()((set, get) => ({
      // ── Estado inicial ──────────────────────────────────────
      players: [],
      tallas: [],
      tallaRules: {},
      overrides: {},
      globalConfig: getDefaultGlobal(),
      screen: 'upload',
      configTab: 'rules',
      activeTalla: null,
      activePieza: 'frente',
      expandedPlayer: null,
      expandedPlayerPieza: 'frente',

      // ── Datos ───────────────────────────────────────────────
      setPlayers: (players, tallas) => {
        const { tallaRules } = get();
        const newRules: Record<string, Rules> = { ...tallaRules };
        tallas.forEach(t => {
          if (!newRules[t]) newRules[t] = buildEmptyRules();
        });
        set({
          players,
          tallas,
          tallaRules: newRules,
          overrides: {},
          screen: 'configure',
          configTab: 'rules',
          activeTalla: tallas[0] ?? null,
          globalConfig: get().globalConfig.EQUIPO ? get().globalConfig : getDefaultGlobal(),
        });
      },

      addPlayer: (player) => {
        const { players, tallas, tallaRules } = get();
        const newPlayers = [...players, player];
        const newTallas = tallas.includes(player.TALLA) ? tallas : [...tallas, player.TALLA];
        const newRules = { ...tallaRules };
        if (!newRules[player.TALLA]) newRules[player.TALLA] = buildEmptyRules();
        set({ players: newPlayers, tallas: newTallas, tallaRules: newRules });
      },

      removePlayer: (idx) => {
        const { players, overrides } = get();
        const newPlayers = players.filter((_, i) => i !== idx);
        // Re-indexar overrides (los índices mayores a idx bajan uno)
        const newOverrides: Overrides = {};
        Object.entries(overrides).forEach(([k, v]) => {
          const i = Number(k);
          if (i < idx) newOverrides[i] = v;
          else if (i > idx) newOverrides[i - 1] = v;
        });
        const newTallas = [...new Set(newPlayers.map(p => p.TALLA))];
        set({ players: newPlayers, overrides: newOverrides, tallas: newTallas });
      },

      updatePlayer: (idx, fields) => {
        const { players, tallaRules } = get();
        const newPlayers = players.map((p, i) => i === idx ? { ...p, ...fields } : p);
        const newTallas = [...new Set(newPlayers.map(p => p.TALLA))];
        const newRules = { ...tallaRules };
        newTallas.forEach(t => { if (!newRules[t]) newRules[t] = buildEmptyRules(); });
        set({ players: newPlayers, tallas: newTallas, tallaRules: newRules });
      },

      setTallaRule: (talla, key, value) => {
        const rules = { ...get().tallaRules };
        if (!rules[talla]) rules[talla] = buildEmptyRules();
        rules[talla] = { ...rules[talla], [key]: value };
        set({ tallaRules: rules });
      },

      setOverride: (idx, key, value) => {
        const { overrides, players, tallaRules } = get();
        const talla = players[idx]?.TALLA ?? '';
        const base = tallaRules[talla] ?? {};
        const current = { ...(overrides[idx] ?? {}) };

        if (String(value) === String(base[key] ?? '')) {
          delete current[key];
        } else {
          current[key] = value;
        }

        const next = { ...overrides };
        if (Object.keys(current).length === 0) {
          delete next[idx];
        } else {
          next[idx] = current;
        }
        set({ overrides: next });
      },

      clearOverride: (idx) => {
        const next = { ...get().overrides };
        delete next[idx];
        set({ overrides: next });
      },

      applyTallaToAll: (talla) => {
        const { players, overrides } = get();
        const next = { ...overrides };
        players.forEach((p, idx) => {
          if (String(p.TALLA ?? '') === talla) delete next[idx];
        });
        set({ overrides: next });
      },

      copyTallaRules: (from, to) => {
        const rules = { ...get().tallaRules };
        rules[to] = { ...(rules[from] ?? {}) };
        set({ tallaRules: rules });
      },

      importAllTallaRules: (rules) => set({ tallaRules: rules }),

      copyTallaRulesToAll: (from) => {
        const { tallas, tallaRules } = get();
        const rules = { ...tallaRules };
        tallas.filter(t => t !== from).forEach(t => {
          rules[t] = { ...(rules[from] ?? {}) };
        });
        set({ tallaRules: rules });
      },

      setGlobalConfig: (key, value) => {
        set({ globalConfig: { ...get().globalConfig, [key]: value } });
      },

      // ── Navegación ──────────────────────────────────────────
      setScreen: (screen) => set({ screen }),
      setConfigTab: (configTab) => set({ configTab }),
      setActiveTalla: (activeTalla) => set({ activeTalla }),
      setActivePieza: (activePieza) => set({ activePieza }),
      setExpandedPlayer: (expandedPlayer) => set({ expandedPlayer }),
      setExpandedPlayerPieza: (expandedPlayerPieza) => set({ expandedPlayerPieza }),

      // ── Getters ─────────────────────────────────────────────
      getPlayerRules: (idx) => {
        const { players, tallaRules, overrides } = get();
        const talla = players[idx]?.TALLA ?? '';
        const base = tallaRules[talla] ?? {};
        return { ...base, ...(overrides[idx] ?? {}) };
      },

      hasOverride: (idx) => {
        const ov = get().overrides[idx];
        return !!ov && Object.keys(ov).length > 0;
      },

      loadFromEntry: (entry, targetScreen = 'configure') => {
        set({
          players:      entry.players,
          tallas:       entry.tallas,
          tallaRules:   entry.tallaRules,
          overrides:    entry.overrides,
          globalConfig: entry.globalConfig,
          screen:       targetScreen,
          configTab:    'rules',
          activeTalla:  entry.tallas[0] ?? '24H',
          expandedPlayer: null,
        });
      },
}));

// ── Helper: guarda el working store en useTeamsStore ──────────
// Importar aquí causaría dependencia circular; se importa desde
// los componentes que necesitan guardar antes de navegar.
export function buildTeamEntryFromWorkingStore(): Omit<TeamEntry, 'id' | 'createdAt' | 'updatedAt'> {
  const s = useTeamStore.getState();
  return {
    nombre:        s.globalConfig.EQUIPO || 'Sin nombre',
    players:       s.players,
    tallas:        s.tallas,
    tallaRules:    s.tallaRules,
    overrides:     s.overrides,
    globalConfig:  s.globalConfig,
    exportHistory: {},
    portalStatus:  'none',
    createdBy:     null,
    portalToken:   null,
    portalExpiry:  null,
  };
}
