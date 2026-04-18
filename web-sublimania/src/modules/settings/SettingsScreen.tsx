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
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setScreen(returnScreen === 'settings' ? 'teams' : returnScreen)}
        >
          ← VOLVER
        </button>
        <h2 className="settings-title">CONFIGURACIÓN</h2>
      </div>

      <div className="config-tabs">
        <button
          className={`tab-btn ${tab === 'clientes' ? 'active' : ''}`}
          onClick={() => setTab('clientes')}
        >
          👤 CLIENTES
        </button>
        <button
          className={`tab-btn ${tab === 'tallas' ? 'active' : ''}`}
          onClick={() => setTab('tallas')}
        >
          📐 TALLAS
        </button>
        {canManageUsers && (
          <button
            className={`tab-btn ${tab === 'users' ? 'active' : ''}`}
            onClick={() => setTab('users')}
          >
            🔑 USUARIOS
          </button>
        )}
      </div>

      <div className="config-body">
        {tab === 'clientes' && <ClientesTab onToast={onToast} />}
        {tab === 'tallas'   && <TallasSettingsTab />}
        {tab === 'users' && canManageUsers && <UsersTab onToast={onToast} />}
      </div>
    </div>
  );
}
