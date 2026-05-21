// ============================================================
//  hooks/usePermission.ts — RBAC helper
// ============================================================
import { useAuthStore } from '../store/useAuthStore';
import type { Permission } from '../types/auth';

export function usePermission(permission: Permission): boolean {
  const session = useAuthStore(s => s.session);
  if (!session) return false;
  return (session.user.permissions ?? []).includes(permission);
}
