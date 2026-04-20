// ============================================================
//  modules/settings/SettingsScreen.tsx
// ============================================================
import { useState } from 'react';
import { useTeamStore } from '../../store/useTeamStore';
import { usePermission } from '../../hooks/usePermission';
import { ClientesTab } from './ClientesTab';
import { TallasSettingsTab } from './TallasSettingsTab';
import { UsersTab } from './UsersTab';
import type { SettingsTab } from '../../types';

interface Props {
  onToast: (msg: string, type: 'ok' | 'error') => void;
}

export function SettingsScreen({ onToast }: Props) {
  const { screen: prevScreen, setScreen } = useTeamStore();
  const canManageUsers = usePermission('users:manage');
  const [tab, setTab] = useState<SettingsTab>('clientes');

  // Volver a la pantalla anterior (no siempre configure)
  const [returnScreen] = useState(prevScreen);

  return (
    <div className="screen settings-screen">
      <div className="settings-header">
        <div className="settings-title-block">
          <div className="settings-title">◈ AJUSTES</div>
          <div className="settings-subtitle">// Administración del sistema</div>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setScreen(returnScreen === 'settings' ? 'teams' : returnScreen)}
        >
          ← VOLVER
        </button>
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
            TALLAS
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
        </nav>

        <div className="settings-content">
          {tab === 'clientes' && <ClientesTab onToast={onToast} />}
          {tab === 'tallas'   && <TallasSettingsTab onToast={onToast} />}
          {tab === 'users' && canManageUsers && <UsersTab onToast={onToast} />}
        </div>
      </div>
    </div>
  );
}
