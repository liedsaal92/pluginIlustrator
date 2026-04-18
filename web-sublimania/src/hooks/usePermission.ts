// ============================================================
//  hooks/usePermission.ts — RBAC helper
// ============================================================
import { useAuthStore } from '../store/useAuthStore';
import { hasPermission, type Permission } from '../types/auth';

/**
 * Retorna true si el usuario activo tiene el permiso solicitado.
 * Si no hay sesión activa, retorna false.
 */
export function usePermission(permission: Permission): boolean {
  const session = useAuthStore(s => s.session);
  if (!session) return false;
  return hasPermission(session.user.role, permission);
}
