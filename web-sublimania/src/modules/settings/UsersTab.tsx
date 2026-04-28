// ============================================================
//  modules/settings/UsersTab.tsx — Gestión de usuarios (admin)
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { authService } from '../../utils/authService';
import type { AuthUser, UserRole } from '../../types/auth';

const APP_URL = window.location.origin;

interface Props {
  onToast: (msg: string, type: 'ok' | 'error') => void;
}

const ROLE_LABELS: Record<UserRole, string> = {
  admin:    'ADMINISTRADOR',
  employee: 'EMPLEADO',
};

export function UsersTab({ onToast }: Props) {
  const currentUser = useAuthStore(s => s.session?.user);
  const [users, setUsers]     = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState<string | null>(null);

  // Invite state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole,  setInviteRole]  = useState<UserRole>('employee');
  const [inviteLink,  setInviteLink]  = useState<string | null>(null);
  const [inviting,    setInviting]    = useState(false);

  const reload = useCallback(async () => {
    try {
      const list = await authService.listUsers();
      setUsers(list);
    } catch (e) {
      onToast((e as Error).message, 'error');
    }
  }, [onToast]);

  useEffect(() => { reload(); }, [reload]);

  async function handleRoleChange(user: AuthUser, newRole: UserRole) {
    if (user.id === currentUser?.id) {
      onToast('No podés cambiar tu propio rol', 'error');
      return;
    }
    try {
      setLoading(user.id);
      await authService.setUserRole(user.id, newRole);
      await reload();
      onToast(`Rol de "${user.nombre}" actualizado a ${ROLE_LABELS[newRole]}`, 'ok');
    } catch (e) {
      onToast((e as Error).message, 'error');
    } finally {
      setLoading(null);
    }
  }

  async function handleDelete(user: AuthUser) {
    if (user.id === currentUser?.id) {
      onToast('No podés eliminar tu propia cuenta desde aquí', 'error');
      return;
    }
    if (!confirm(`¿Eliminar al usuario "${user.nombre}" (${user.email})?\nEsta acción no se puede deshacer.`)) return;
    try {
      setLoading(user.id);
      await authService.deleteUser(user.id);
      await reload();
      onToast(`Usuario "${user.nombre}" eliminado`, 'ok');
    } catch (e) {
      onToast((e as Error).message, 'error');
    } finally {
      setLoading(null);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    try {
      setInviting(true);
      setInviteLink(null);
      const token = await authService.createInvite(inviteEmail.trim(), inviteRole);
      setInviteLink(`${APP_URL}/?invite=${token}`);
      setInviteEmail('');
    } catch (err) {
      onToast((err as Error).message, 'error');
    } finally {
      setInviting(false);
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  }

  return (
    <div className="users-tab">
      <div className="users-tab-header">
        <div className="users-count">{users.length} usuario{users.length !== 1 ? 's' : ''} registrado{users.length !== 1 ? 's' : ''}</div>
        <div className="users-note">Los roles se aplican al próximo inicio de sesión.</div>
      </div>

      {users.length === 0 ? (
        <div className="users-empty">Sin usuarios registrados</div>
      ) : (
        <div className="users-list">
          {users.map(u => {
            const isSelf    = u.id === currentUser?.id;
            const isWorking = loading === u.id;
            return (
              <div key={u.id} className={`user-row${isSelf ? ' user-row-self' : ''}`}>
                <div className="user-info">
                  <div className="user-name">
                    {u.nombre}
                    {isSelf && <span className="user-self-badge">TÚ</span>}
                  </div>
                  <div className="user-email">{u.email}</div>
                  <div className="user-since">Desde {formatDate(u.createdAt)}</div>
                </div>

                <div className="user-actions">
                  <select
                    className="input-global user-role-select"
                    value={u.role}
                    disabled={isSelf || isWorking}
                    onChange={e => handleRoleChange(u, e.target.value as UserRole)}
                  >
                    <option value="admin">ADMINISTRADOR</option>
                    <option value="employee">EMPLEADO</option>
                  </select>

                  {!isSelf && (
                    <button
                      className="btn btn-ghost btn-sm btn-danger"
                      disabled={isWorking}
                      onClick={() => handleDelete(u)}
                      title="Eliminar usuario"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Invite section */}
      <div className="invite-section">
        <div className="invite-title">INVITAR USUARIO</div>
        <form className="invite-form" onSubmit={handleInvite}>
          <input
            className="input-global invite-email"
            type="email"
            placeholder="email@empresa.com"
            value={inviteEmail}
            onChange={e => { setInviteEmail(e.target.value); setInviteLink(null); }}
            disabled={inviting}
          />
          <select
            className="input-global invite-role"
            value={inviteRole}
            onChange={e => setInviteRole(e.target.value as UserRole)}
            disabled={inviting}
          >
            <option value="employee">EMPLEADO</option>
            <option value="admin">ADMINISTRADOR</option>
          </select>
          <button className="btn btn-primary" type="submit" disabled={inviting || !inviteEmail.trim()}>
            {inviting ? 'GENERANDO...' : 'GENERAR LINK'}
          </button>
        </form>

        {inviteLink && (
          <div className="invite-result">
            <div className="invite-result-label">Link de invitación (válido 7 días):</div>
            <div className="invite-link-row">
              <input className="input-global invite-link-input" readOnly value={inviteLink} />
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => { navigator.clipboard.writeText(inviteLink); onToast('Link copiado', 'ok'); }}
              >
                COPIAR
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
