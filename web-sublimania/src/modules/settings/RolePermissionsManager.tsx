// ============================================================
//  modules/settings/RolePermissionsManager.tsx
// ============================================================
import { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import type { Permission, UserRole } from '../../types/auth';

interface RoleRow { id: string; name: UserRole; description: string }
interface PermRow { id: string; name: Permission; description: string }

interface Props {
  onToast: (msg: string, type: 'ok' | 'error') => void;
}

// Mapeo de permisos a secciones del sidebar (mismo orden y labels que el sidebar)
const PERM_SECTIONS: { perm: Permission; icon: string; label: string; sublabel: string }[] = [
  { perm: 'teams:read',      icon: '☰', label: 'MIS EQUIPOS',         sublabel: 'Ver lista de equipos y preview' },
  { perm: 'teams:write',     icon: '⚙', label: 'CARGAR / CONFIGURAR', sublabel: 'Cargar Excel y editar configuración del equipo' },
  { perm: 'export:run',      icon: '↗', label: 'EXPORTAR CSV',         sublabel: 'Generar y descargar el archivo CSV' },
  { perm: 'settings:manage', icon: '◈', label: 'AJUSTES',              sublabel: 'Clientes, moldes, tallas, tipos y backup' },
  { perm: 'users:manage',    icon: '◉', label: 'USUARIOS',             sublabel: 'Gestionar miembros de la organización' },
  { perm: 'billing:manage',  icon: '$', label: 'PRECIOS',              sublabel: 'Cotizador, costos, tablas y dashboard' },
];

export function RolePermissionsManager({ onToast }: Props) {
  const refreshSession   = useAuthStore(s => s.refreshSession);
  const [roles, setRoles]             = useState<RoleRow[]>([]);
  const [perms, setPerms]             = useState<PermRow[]>([]);
  const [matrix, setMatrix]           = useState<Record<string, Set<string>>>({});
  const [selectedRoleId, setSelected] = useState<string>('');
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [rolesRes, permsRes, rpRes] = await Promise.all([
      supabase.from('roles').select('id, name, description').order('name'),
      supabase.from('permissions').select('id, name, description').order('name'),
      supabase.from('role_permissions').select('role_id, permission_id'),
    ]);

    const allRoles = (rolesRes.data ?? []) as RoleRow[];
    const allPerms = (permsRes.data ?? []) as PermRow[];
    const rpRows   = (rpRes.data ?? []) as { role_id: string; permission_id: string }[];

    const m: Record<string, Set<string>> = {};
    for (const r of allRoles) m[r.id] = new Set();
    for (const rp of rpRows) m[rp.role_id]?.add(rp.permission_id);

    const editable = allRoles.filter(r => r.name !== 'admin');

    setRoles(allRoles);
    setPerms(allPerms);
    setMatrix(m);
    setSelected(editable[0]?.id ?? '');
    setLoading(false);
  }

  function toggle(roleId: string, permId: string) {
    setMatrix(prev => {
      const next = { ...prev, [roleId]: new Set(prev[roleId]) };
      if (next[roleId].has(permId)) next[roleId].delete(permId);
      else next[roleId].add(permId);
      return next;
    });
  }

  async function save() {
    setSaving(true);
    try {
      const editableRoles = roles.filter(r => r.name !== 'admin');
      for (const role of editableRoles) {
        const permIds = Array.from(matrix[role.id] ?? []);
        await supabase.from('role_permissions').delete().eq('role_id', role.id);
        if (permIds.length > 0) {
          const { error } = await supabase.from('role_permissions').insert(
            permIds.map(pid => ({ role_id: role.id, permission_id: pid }))
          );
          if (error) throw new Error(error.message);
        }
      }
      await refreshSession();
      onToast('Permisos guardados', 'ok');
    } catch (e) {
      onToast((e as Error).message ?? 'Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  }

  const editableRoles = roles.filter(r => r.name !== 'admin');

  if (loading) return <div className="users-empty">Cargando permisos…</div>;

  return (
    <div className="users-tab">

      <div className="users-tab-header">
        <div className="users-count">
          {PERM_SECTIONS.length} secciones del sistema
        </div>
        <div className="users-note">El rol ADMIN siempre tiene acceso completo.</div>
      </div>

      {/* Selector de rol — solo si hay más de uno editable */}
      {editableRoles.length > 1 && (
        <div className="rp-role-tabs">
          {editableRoles.map(r => (
            <button
              key={r.id}
              className={`btn btn-sm ${selectedRoleId === r.id ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setSelected(r.id)}
            >
              {r.name.toUpperCase()}
            </button>
          ))}
        </div>
      )}

      {/* Lista de secciones */}
      {selectedRoleId && (
        <div className="users-list">
          {PERM_SECTIONS.map(({ perm, icon, label, sublabel }) => {
            const permRow = perms.find(p => p.name === perm);
            if (!permRow) return null;
            const checked = matrix[selectedRoleId]?.has(permRow.id) ?? false;
            return (
              <div
                key={perm}
                className="user-row"
                style={{ cursor: 'pointer' }}
                onClick={() => toggle(selectedRoleId, permRow.id)}
              >
                <div className="user-info">
                  <div className="user-name">
                    <span className="rp-section-icon">{icon}</span>
                    {label}
                  </div>
                  <div className="user-email">{sublabel}</div>
                </div>
                <div className="user-actions">
                  <input
                    type="checkbox"
                    className="rp-checkbox"
                    checked={checked}
                    onChange={() => toggle(selectedRoleId, permRow.id)}
                    onClick={e => e.stopPropagation()}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Acción guardar */}
      <div className="invite-section">
        <div className="invite-form">
          <button
            className="btn btn-primary"
            onClick={save}
            disabled={saving}
          >
            {saving ? 'GUARDANDO…' : '↗ GUARDAR CAMBIOS'}
          </button>
          <span className="rp-note">
            Los cambios aplican al próximo inicio de sesión de los usuarios afectados.
          </span>
        </div>
      </div>

    </div>
  );
}
