// ============================================================
//  modules/settings/SettingsScreen.tsx
// ============================================================
import { useState } from 'react';
import { usePermission } from '../../hooks/usePermission';
import { ClientesTab } from './ClientesTab';
import { TallasSettingsTab } from './TallasSettingsTab';
import { TallasDefaultTab } from './TallasDefaultTab';
import { MoldesTab } from './MoldesTab';
import { TiposClienteTab } from './TiposClienteTab';
import { UsersTab } from './UsersTab';
import { RolePermissionsManager } from './RolePermissionsManager';
import { MigrateDataBanner } from '../pricing/MigrateDataBanner';
import type { SettingsTab } from '../../types';

interface Props {
  onToast: (msg: string, type: 'ok' | 'error') => void;
}

export function SettingsScreen({ onToast }: Props) {
  const canManageUsers = usePermission('users:manage');
  const [tab, setTab] = useState<SettingsTab>('clientes');

  return (
    <div className="screen settings-screen">
      <MigrateDataBanner />
      <div className="settings-header">
        <div className="settings-title-block">
          <div className="settings-title">◈ AJUSTES</div>
          <div className="settings-subtitle">// Administración del sistema</div>
        </div>
      </div>

      <div className="settings-body">
        <nav className="settings-sidenav">
          <button
            className={`settings-nav-item ${tab === 'clientes' ? 'active' : ''}`}
            onClick={() => setTab('clientes')}
          >
            <span className="settings-nav-icon">◉</span>
            CLIENTES
          </button>
          <button
            className={`settings-nav-item ${tab === 'tallas' ? 'active' : ''}`}
            onClick={() => setTab('tallas')}
          >
            <span className="settings-nav-icon">▦</span>
            TALLAS POR CLIENTE
          </button>
          <button
            className={`settings-nav-item ${tab === 'tallas_default' ? 'active' : ''}`}
            onClick={() => setTab('tallas_default')}
          >
            <span className="settings-nav-icon">◧</span>
            TALLAS BASE
          </button>
          <button
            className={`settings-nav-item ${tab === 'moldes' ? 'active' : ''}`}
            onClick={() => setTab('moldes')}
          >
            <span className="settings-nav-icon">◫</span>
            MOLDES
          </button>
          <button
            className={`settings-nav-item ${tab === 'tipos' ? 'active' : ''}`}
            onClick={() => setTab('tipos')}
          >
            <span className="settings-nav-icon">◆</span>
            TIPOS
          </button>
          {canManageUsers && (
            <button
              className={`settings-nav-item ${tab === 'users' ? 'active' : ''}`}
              onClick={() => setTab('users')}
            >
              <span className="settings-nav-icon">◈</span>
              USUARIOS
            </button>
          )}
          {canManageUsers && (
            <button
              className={`settings-nav-item ${tab === 'roles' ? 'active' : ''}`}
              onClick={() => setTab('roles')}
            >
              <span className="settings-nav-icon">▤</span>
              ROLES
            </button>
          )}
        </nav>

        <div className="settings-content">
          {tab === 'clientes' && <ClientesTab onToast={onToast} />}
          {tab === 'tallas'         && <TallasSettingsTab onToast={onToast} />}
          {tab === 'tallas_default' && <TallasDefaultTab onToast={onToast} />}
          {tab === 'moldes'         && <MoldesTab onToast={onToast} />}
          {tab === 'tipos'    && <TiposClienteTab onToast={onToast} />}
          {tab === 'users' && canManageUsers && <UsersTab onToast={onToast} />}
          {tab === 'roles' && canManageUsers && <RolePermissionsManager onToast={onToast} />}
        </div>
      </div>
    </div>
  );
}
