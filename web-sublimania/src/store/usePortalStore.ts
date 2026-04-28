// ============================================================
//  store/usePortalStore.ts — Gestión del portal (costurera)
//  Jugadores pendientes, aprobación, creación de portal teams
// ============================================================
import { create } from 'zustand';
import { supabase } from '../utils/supabase';
import { useAuthStore } from './useAuthStore';
import { useTeamsStore } from './useTeamsStore';

function getOrgId(): string {
  const orgId = useAuthStore.getState().session?.user.orgId;
  if (!orgId) throw new Error('No org_id');
  return orgId;
}

function getUserId(): string {
  const id = useAuthStore.getState().session?.user.id;
  if (!id) throw new Error('No user id');
  return id;
}

function generateToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(18)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export interface PendingPlayer {
  position:       number;
  cedula:         string;
  nombre:         string;
  nombre_camiseta: string;
  numero:         string;
  talla:          string;
  submitted_at:   string;
  player_status:  string;
}

interface PortalState {
  pendingByTeam: Record<string, PendingPlayer[]>;
  loading:       boolean;

  loadPendingPlayers: (teamId: string) => Promise<void>;
  deletePlayer:       (teamId: string, position: number) => Promise<void>;
  approvePortal:      (teamId: string, token: string) => Promise<void>;
  createPortalTeam:   (nombre: string, expiresAt: string | null) => Promise<string | null>;
}

export const usePortalStore = create<PortalState>()((set, _get) => ({
  pendingByTeam: {},
  loading:       false,

  loadPendingPlayers: async (teamId) => {
    const orgId = getOrgId();
    set({ loading: true });
    const { data, error } = await supabase
      .from('players')
      .select('position,cedula,nombre,nombre_camiseta,numero,talla,submitted_at,player_status')
      .eq('team_id', teamId)
      .eq('org_id', orgId)
      .in('player_status', ['pending', 'additional'])
      .order('submitted_at');
    set({ loading: false });
    if (error) { console.error('portal.loadPending:', error); return; }
    set(s => ({
      pendingByTeam: { ...s.pendingByTeam, [teamId]: (data ?? []) as PendingPlayer[] },
    }));
  },

  deletePlayer: async (teamId, position) => {
    const orgId = getOrgId();
    set(s => ({
      pendingByTeam: {
        ...s.pendingByTeam,
        [teamId]: (s.pendingByTeam[teamId] ?? []).filter(p => p.position !== position),
      },
    }));
    await supabase.from('players')
      .delete()
      .eq('team_id', teamId)
      .eq('org_id', orgId)
      .eq('position', position);
  },

  approvePortal: async (teamId, token) => {
    const { error } = await supabase.rpc('approve_portal', { p_token: token });
    if (error) { console.error('portal.approve:', error); throw error; }

    // Actualizar teams store local
    useTeamsStore.setState(s => ({
      teams: s.teams.map(t =>
        t.id === teamId ? { ...t, portalStatus: 'approved' } : t
      ),
    }));
    // Limpiar pendientes locales
    set(s => ({ pendingByTeam: { ...s.pendingByTeam, [teamId]: [] } }));
  },

  createPortalTeam: async (nombre, expiresAt) => {
    const orgId  = getOrgId();
    const userId = getUserId();
    const token  = generateToken();
    const now    = new Date().toISOString();
    const id     = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });

    // 1. Crear team
    const { error: teamErr } = await supabase.from('teams').insert({
      id,
      org_id:        orgId,
      nombre:        nombre.trim().toUpperCase(),
      notas:         '',
      created_by:    userId,
      portal_status: 'collecting',
      created_at:    now,
      updated_at:    now,
    });
    if (teamErr) { console.error('portal.createTeam:', teamErr); return null; }

    // 2. Crear portal_link
    const { error: linkErr } = await supabase.from('portal_links').insert({
      token,
      team_id:    id,
      org_id:     orgId,
      status:     'open',
      expires_at: expiresAt,
    });
    if (linkErr) { console.error('portal.createLink:', linkErr); return null; }

    // 3. Actualizar store local
    const newTeam = {
      id,
      nombre:        nombre.trim().toUpperCase(),
      createdAt:     now,
      updatedAt:     now,
      players:       [],
      tallas:        [],
      tallaRules:    {},
      overrides:     {},
      globalConfig:  { EQUIPO: nombre.trim().toUpperCase(), NOTAS: '' },
      exportHistory: {},
      portalStatus:  'collecting' as const,
      createdBy:     userId,
      portalToken:   token,
      portalExpiry:  expiresAt,
    };
    useTeamsStore.setState(s => ({ teams: [newTeam, ...s.teams] }));

    return token;
  },
}));
