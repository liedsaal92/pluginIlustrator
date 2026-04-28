// ============================================================
//  store/useTeamsStore.ts — Master store de todos los equipos
//  Backed by Supabase. Optimistic updates — UI responde instantáneo.
// ============================================================
import { create } from 'zustand';
import { supabase } from '../utils/supabase';
import { useAuthStore } from './useAuthStore';
import type { TeamEntry, Rules, Overrides } from '../types';
import { buildTeamEntryFromWorkingStore } from './useTeamStore';

export function saveActiveTeam(): void {
  const { activeTeamId, getActiveTeam, saveTeam } = useTeamsStore.getState();
  if (!activeTeamId) return;
  const current = getActiveTeam();
  const partial = buildTeamEntryFromWorkingStore();
  saveTeam(activeTeamId, { ...partial, exportHistory: current?.exportHistory ?? {} });
}

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function getOrgId(): string {
  const orgId = useAuthStore.getState().session?.user.orgId;
  if (!orgId) throw new Error('No org_id — usuario no autenticado');
  return orgId;
}

// Escribe un equipo completo en Supabase (players, rules, overrides)
async function persistTeam(id: string, orgId: string, entry: TeamEntry): Promise<void> {
  const now = new Date().toISOString();

  // 1. Upsert fila del equipo
  await supabase.from('teams').upsert({
    id,
    org_id:    orgId,
    nombre:    entry.nombre,
    notas:     entry.globalConfig.NOTAS ?? '',
    updated_at: now,
  }, { onConflict: 'id,org_id' });

  // 2. Players — delete + re-insert (maneja agregados/eliminados/reordenados)
  await supabase.from('players').delete().eq('team_id', id).eq('org_id', orgId);
  if (entry.players.length > 0) {
    await supabase.from('players').insert(
      entry.players.map((p, position) => ({
        team_id:         id,
        org_id:          orgId,
        position,
        nombre:          p.NOMBRE,
        nombre_camiseta: p.NOMBRE_CAMISETA,
        numero:          p.NUMERO,
        talla:           p.TALLA,
      }))
    );
  }

  // 3. Talla rules — upsert por talla
  const rulesRows = Object.entries(entry.tallaRules).map(([talla, rules]) => ({
    team_id: id, org_id: orgId, talla, rules,
  }));
  if (rulesRows.length > 0) {
    await supabase.from('talla_rules')
      .upsert(rulesRows, { onConflict: 'team_id,org_id,talla' });
  }

  // 4. Player overrides — delete + re-insert los no vacíos
  await supabase.from('player_overrides').delete().eq('team_id', id).eq('org_id', orgId);
  const overrideRows = Object.entries(entry.overrides)
    .filter(([, v]) => Object.keys(v).length > 0)
    .map(([pos, overrides]) => ({
      team_id: id, org_id: orgId, player_position: Number(pos), overrides,
    }));
  if (overrideRows.length > 0) {
    await supabase.from('player_overrides').insert(overrideRows);
  }
}

// Reconstruye TeamEntry[] desde las 4 tablas
function buildTeams(
  teamsData:     { id: string; nombre: string; notas: string; base_team_id: string | null; created_at: string; updated_at: string }[],
  playersData:   { team_id: string; position: number; nombre: string; nombre_camiseta: string; numero: string; talla: string }[],
  rulesData:     { team_id: string; talla: string; rules: Rules }[],
  overridesData: { team_id: string; player_position: number; overrides: Overrides[number] }[],
): TeamEntry[] {
  const playersByTeam  = groupBy(playersData,   'team_id');
  const rulesByTeam    = groupBy(rulesData,     'team_id');
  const overridesByTeam = groupBy(overridesData, 'team_id');

  return teamsData.map(t => {
    const players = (playersByTeam[t.id] ?? [])
      .sort((a, b) => a.position - b.position)
      .map(p => ({ NOMBRE: p.nombre, NOMBRE_CAMISETA: p.nombre_camiseta, NUMERO: p.numero, TALLA: p.talla }));

    const tallaRules: Record<string, Rules> = {};
    (rulesByTeam[t.id] ?? []).forEach(r => { tallaRules[r.talla] = r.rules; });

    const overrides: Overrides = {};
    (overridesByTeam[t.id] ?? []).forEach(o => { overrides[o.player_position] = o.overrides; });

    const tallas = [...new Set(players.map(p => p.TALLA))];

    return {
      id:           t.id,
      nombre:       t.nombre,
      createdAt:    t.created_at,
      updatedAt:    t.updated_at,
      players,
      tallas,
      tallaRules,
      overrides,
      globalConfig: { EQUIPO: t.nombre, NOTAS: t.notas ?? '' },
      exportHistory: {},
    };
  });
}

function groupBy<T extends Record<string, unknown>>(arr: T[], key: string): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  for (const item of arr) {
    const k = String(item[key]);
    if (!result[k]) result[k] = [];
    result[k].push(item);
  }
  return result;
}

interface TeamsState {
  teams:        TeamEntry[];
  activeTeamId: string | null;
  baseTeamId:   string | null;
  loading:      boolean;

  init:         () => Promise<void>;
  getActiveTeam: () => TeamEntry | null;
  createTeam:   (data: Omit<TeamEntry, 'id' | 'createdAt' | 'updatedAt'>) => string;
  saveTeam:     (id: string, data: Omit<TeamEntry, 'id' | 'createdAt' | 'updatedAt'>) => void;
  switchTeam:   (id: string) => void;
  deleteTeam:   (id: string) => void;
  setBaseTeam:  (id: string | null) => void;
  markExported: (id: string, tallas: string[]) => void;
  replaceAll:   (teams: TeamEntry[]) => void;
}

export const useTeamsStore = create<TeamsState>()((set, get) => ({
  teams:        [],
  activeTeamId: null,
  baseTeamId:   null,
  loading:      false,

  // ── Carga inicial desde Supabase ─────────────────────────────
  init: async () => {
    const orgId = getOrgId();
    set({ loading: true });

    const [teamsRes, playersRes, rulesRes, overridesRes] = await Promise.all([
      supabase.from('teams').select('id,nombre,notas,base_team_id,created_at,updated_at').eq('org_id', orgId).order('updated_at', { ascending: false }),
      supabase.from('players').select('team_id,position,nombre,nombre_camiseta,numero,talla').eq('org_id', orgId).order('position'),
      supabase.from('talla_rules').select('team_id,talla,rules').eq('org_id', orgId),
      supabase.from('player_overrides').select('team_id,player_position,overrides').eq('org_id', orgId),
    ]);

    set({ loading: false });

    if (teamsRes.error || playersRes.error || rulesRes.error || overridesRes.error) {
      console.error('teams.init error', teamsRes.error ?? playersRes.error ?? rulesRes.error ?? overridesRes.error);
      return;
    }

    const teams = buildTeams(
      teamsRes.data    ?? [],
      playersRes.data  ?? [],
      rulesRes.data    ?? [],
      overridesRes.data ?? [],
    );
    set({ teams });
  },

  // ── Selectors ─────────────────────────────────────────────────
  getActiveTeam: () => {
    const { teams, activeTeamId } = get();
    return teams.find(t => t.id === activeTeamId) ?? null;
  },

  // ── Mutations — optimistic ────────────────────────────────────
  createTeam: (data) => {
    const id    = generateId();
    const orgId = getOrgId();
    const now   = new Date().toISOString();
    const entry: TeamEntry = { id, createdAt: now, updatedAt: now, ...data };
    set(s => ({ teams: [...s.teams, entry], activeTeamId: id }));
    supabase.from('teams').insert({
      id, org_id: orgId, nombre: data.nombre, notas: data.globalConfig.NOTAS ?? '',
      created_at: now, updated_at: now,
    }).then(({ error }) => { if (error) console.error('teams.create:', error); });
    return id;
  },

  saveTeam: (id, data) => {
    const orgId = getOrgId();
    const now   = new Date().toISOString();
    const entry = { id, createdAt: '', updatedAt: now, ...data } as TeamEntry;
    set(s => ({
      teams: s.teams.map(t => t.id === id ? { ...t, ...data, updatedAt: now } : t),
    }));
    persistTeam(id, orgId, entry).catch(e => console.error('teams.save:', e));
  },

  switchTeam: (id) => set({ activeTeamId: id }),

  setBaseTeam: (id) => set(s => ({ baseTeamId: s.baseTeamId === id ? null : id })),

  deleteTeam: (id) => {
    const orgId = getOrgId();
    set(s => {
      const teams        = s.teams.filter(t => t.id !== id);
      const activeTeamId = s.activeTeamId === id ? (teams[0]?.id ?? null) : s.activeTeamId;
      const baseTeamId   = s.baseTeamId === id ? null : s.baseTeamId;
      return { teams, activeTeamId, baseTeamId };
    });
    // Cascade manual (RLS no hace cascade entre tablas TEXT)
    Promise.all([
      supabase.from('teams').delete().eq('id', id).eq('org_id', orgId),
      supabase.from('players').delete().eq('team_id', id).eq('org_id', orgId),
      supabase.from('talla_rules').delete().eq('team_id', id).eq('org_id', orgId),
      supabase.from('player_overrides').delete().eq('team_id', id).eq('org_id', orgId),
    ]).catch(e => console.error('teams.delete:', e));
  },

  markExported: (id, tallas) => {
    const now = new Date().toISOString();
    set(s => ({
      teams: s.teams.map(t =>
        t.id === id
          ? { ...t, exportHistory: { ...t.exportHistory, ...Object.fromEntries(tallas.map(talla => [talla, { exportedAt: now }])) } }
          : t
      ),
    }));
  },

  replaceAll: (teams) => {
    const orgId = getOrgId();
    set(s => ({
      teams,
      activeTeamId: teams.find(t => t.id === s.activeTeamId)?.id ?? null,
    }));
    // Bulk persist todos los equipos en background
    teams.forEach(t => persistTeam(t.id, orgId, t).catch(e => console.error('teams.replaceAll:', e)));
  },
}));
