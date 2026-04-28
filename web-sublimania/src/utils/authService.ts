// ============================================================
//  utils/authService.ts — Operaciones de autenticación (Supabase)
// ============================================================
import { supabase } from './supabase';
import type { AuthSession, AuthUser, UserRole } from '../types/auth';

// ── Helpers ───────────────────────────────────────────────────

type OrgRow      = { name: string; slug: string };
type UserRoleRow = { roles: { name: string } };

async function buildSession(
  supabaseSession: { access_token: string; expires_at?: number },
  userId: string,
  email: string,
): Promise<AuthSession> {
  const { data: userRow } = await supabase
    .from('users')
    .select('nombre, org_id, created_at, organizations ( name, slug ), user_roles ( roles ( name ) )')
    .eq('id', userId)
    .single();

  if (!userRow) throw new Error('Perfil de usuario no encontrado');

  const org  = (userRow.organizations as unknown as OrgRow | null);
  const role = ((userRow.user_roles as unknown as UserRoleRow[]))?.[0]?.roles?.name as UserRole ?? 'employee';

  const user: AuthUser = {
    id:        userId,
    email,
    nombre:    userRow.nombre,
    role,
    orgId:     userRow.org_id,
    orgName:   org?.name ?? '',
    orgSlug:   org?.slug ?? '',
    createdAt: userRow.created_at,
  };

  return {
    user,
    accessToken: supabaseSession.access_token,
    expiresAt:   (supabaseSession.expires_at ?? 0) * 1000,
  };
}

// ── OPERACIONES ───────────────────────────────────────────────

export const authService = {

  async login(email: string, password: string): Promise<AuthSession> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return buildSession(data.session, data.user.id, data.user.email!);
  },

  async register(email: string, password: string, nombre: string, orgName: string): Promise<AuthSession> {
    // El trigger handle_new_user crea org + perfil + rol admin con los metadatos
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nombre, org_name: orgName } },
    });
    if (error) throw new Error(error.message);
    if (!data.user || !data.session) throw new Error('No se pudo crear el usuario');
    return buildSession(data.session, data.user.id, email);
  },

  async acceptInvite(token: string, nombre: string, password: string): Promise<AuthSession> {
    // 1. Obtener email via RPC pública (SECURITY DEFINER — bypass RLS para anon)
    const { data: email, error: invErr } = await supabase
      .rpc('get_invite_email', { p_token: token });
    if (invErr || !email) throw new Error('Invitación inválida o expirada');
    const invite = { email: email as string };

    // 2. signUp — el trigger detecta el invite y omite crear org
    //    (ver trigger_register_org.sql — check de invite pendiente)
    const { data, error } = await supabase.auth.signUp({
      email:   invite.email,
      password,
      options: { data: { nombre, invite_token: token } },
    });
    if (error) throw new Error(error.message);
    if (!data.user || !data.session) throw new Error('No se pudo crear el usuario');

    // 3. RPC accept_invite — crea perfil + asigna rol + marca invite usado
    const { error: rpcErr } = await supabase.rpc('accept_invite', {
      p_token:  token,
      p_nombre: nombre,
    });
    if (rpcErr) throw new Error(rpcErr.message);

    return buildSession(data.session, data.user.id, invite.email);
  },

  async logout(): Promise<void> {
    await supabase.auth.signOut();
  },

  isSessionValid(session: AuthSession | null): boolean {
    if (!session) return false;
    return Date.now() < session.expiresAt;
  },

  // ── Gestión de usuarios (admin, filtrado por RLS a su org) ──

  async listUsers(): Promise<AuthUser[]> {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, nombre, org_id, created_at, organizations ( name, slug ), user_roles ( roles ( name ) )')
      .order('created_at');
    if (error) throw new Error(error.message);

    return (data ?? []).map(u => {
      const org  = (u.organizations as unknown as OrgRow | null);
      const role = ((u.user_roles as unknown as UserRoleRow[]))?.[0]?.roles?.name as UserRole ?? 'employee';
      return {
        id:        u.id,
        email:     u.email,
        nombre:    u.nombre,
        role,
        orgId:     u.org_id,
        orgName:   org?.name ?? '',
        orgSlug:   org?.slug ?? '',
        createdAt: u.created_at,
      };
    });
  },

  async setUserRole(userId: string, role: UserRole): Promise<void> {
    const { data: roleRow, error: roleErr } = await supabase
      .from('roles').select('id').eq('name', role).single();
    if (roleErr || !roleRow) throw new Error('Rol inválido');

    const { error } = await supabase
      .from('user_roles').update({ role_id: roleRow.id }).eq('user_id', userId);
    if (error) throw new Error(error.message);
  },

  async requestPasswordReset(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/`,
    });
    if (error) throw new Error(error.message);
  },

  async updatePassword(newPassword: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
  },

  async deleteUser(userId: string): Promise<void> {
    // Por ahora solo borra perfil público.
    // Producción: Edge Function con service_role para auth.admin.deleteUser()
    const { error } = await supabase.from('users').delete().eq('id', userId);
    if (error) throw new Error(error.message);
  },

  async createInvite(email: string, role: UserRole = 'employee'): Promise<string> {
    const { data, error } = await supabase.rpc('create_invite', {
      p_email:     email,
      p_role_name: role,
    });
    if (error) throw new Error(error.message);
    return (data as { token: string }).token;
  },
};
