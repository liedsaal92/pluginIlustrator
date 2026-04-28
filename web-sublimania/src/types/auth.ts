// ============================================================
//  types/auth.ts — Auth + RBAC types (multi-tenant SaaS)
//  Diseñado para Supabase — compatible con mock local
// ============================================================

export type UserRole = 'admin' | 'employee';

// ── Sesión activa ─────────────────────────────────────────────
export interface AuthUser {
  id:        string;
  email:     string;
  nombre:    string;
  role:      UserRole;
  orgId:     string;   // UUID de la organización (tenant)
  orgName:   string;   // Nombre de la empresa
  orgSlug:   string;   // Slug URL-friendly
  createdAt: string;
}

export interface AuthSession {
  user:        AuthUser;
  accessToken: string;   // Supabase JWT en Fase 2
  expiresAt:   number;   // Unix ms timestamp
}

// ── DB shapes (Supabase Fase 2) ───────────────────────────────
export interface DBOrganization {
  id:            string;
  name:          string;
  slug:          string;
  plan:          OrgPlan;
  plan_status:   OrgPlanStatus;
  trial_ends_at: string;
  created_at:    string;
}

export interface DBUser {
  id:         string;   // references auth.users(id)
  org_id:     string;
  email:      string;
  nombre:     string;
  created_at: string;
}

export interface DBRole {
  id:          string;
  name:        UserRole;
  description: string;
}

export interface DBPermission {
  id:          string;
  name:        Permission;
  description: string;
}

export interface DBUserRole {
  user_id:     string;
  role_id:     string;
  assigned_at: string;
}

export interface DBRolePermission {
  role_id:       string;
  permission_id: string;
}

export interface DBInvite {
  id:          string;
  org_id:      string;
  email:       string;
  role_id:     string;
  token:       string;
  invited_by:  string;
  accepted_at: string | null;
  expires_at:  string;
  created_at:  string;
}

// ── Plan / suscripción ─────────────────────────────────────────
export type OrgPlan       = 'trial' | 'starter' | 'pro' | 'enterprise';
export type OrgPlanStatus = 'active' | 'suspended' | 'cancelled';

// ── Permisos granulares ───────────────────────────────────────
export type Permission =
  | 'teams:read'
  | 'teams:write'
  | 'settings:manage'
  | 'users:manage'
  | 'export:run'
  | 'billing:manage';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin:    ['teams:read', 'teams:write', 'settings:manage', 'users:manage', 'export:run', 'billing:manage'],
  employee: ['teams:read', 'teams:write', 'export:run'],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
