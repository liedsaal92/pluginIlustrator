// ============================================================
//  components/layout/Header.tsx
// ============================================================
import { useRef } from 'react';
import { useTeamStore } from '../../store/useTeamStore';
import { useTeamsStore, saveActiveTeam } from '../../store/useTeamsStore';
import { useTallasStore } from '../../store/useTallasStore';
import { useClientesStore } from '../../store/useClientesStore';
import { useAuthStore } from '../../store/useAuthStore';
import { usePermission } from '../../hooks/usePermission';
import { exportBackup, importBackup, mergeBackup } from '../../utils/configBackup';

interface Props {
  onToast: (msg: string, type: 'ok' | 'error') => void;
}

export function Header({ onToast }: Props) {
  const setScreen = useTeamStore(s => s.setScreen);
  const { session, logout } = useAuthStore();
  const canManageSettings = usePermission('settings:manage');
  const importInputRef = useRef<HTMLInputElement>(null);

  function handleExportBackup() {
    saveActiveTeam();
    const { teams: allTeams } = useTeamsStore.getState();
    const { clientes } = useClientesStore.getState();
    const { tallasPorCliente } = useTallasStore.getState();
    exportBackup(clientes, tallasPorCliente, allTeams);
    onToast('Configuración exportada', 'ok');
  }

  async function handleImportBackupFile(file: File) {
    try {
      const backup = await importBackup(file);
      const { clientes: curClientes } = useClientesStore.getState();
      const { tallasPorCliente: curTallas } = useTallasStore.getState();
      const result = mergeBackup(backup, curClientes, curTallas, useTeamsStore.getState().teams);

      useClientesStore.setState({ clientes: result.clientes });
      useTallasStore.setState({ tallasPorCliente: result.tallasPorCliente });
      useTeamsStore.getState().replaceAll(result.teams);

      const parts: string[] = [];
      if (result.teamsAdded) parts.push(`${result.teamsAdded} equipo(s) nuevo(s)`);
      if (result.teamsUpdated) parts.push(`${result.teamsUpdated} equipo(s) actualizado(s)`);
      if (result.teamsMerged) parts.push(`${result.teamsMerged} equipo(s) combinado(s) por nombre`);
      if (result.clientesAdded) parts.push(`${result.clientesAdded} cliente(s) nuevo(s)`);
      if (result.clientesUpdated) parts.push(`${result.clientesUpdated} cliente(s) actualizado(s)`);
      if (result.tallasUpdated) parts.push(`${result.tallasUpdated} cliente(s) con tallas actualizadas`);

      onToast(parts.length ? `Combinado: ${parts.join(', ')}` : 'Sin cambios nuevos', 'ok');
    } catch (e) {
      onToast((e as Error).message ?? 'Error al importar', 'error');
    }
  }

  return (
    <header className="site-header">
      <div className="header-main">
        <div className="logo" onClick={() => setScreen('upload')} style={{ cursor: 'pointer' }}>
          <div className="logo-name">SUBLI<span>FLOW</span></div>
          <div className="logo-tag">Motor de Automatización de Producción Deportiva v1.0</div>
        </div>

        <div className="header-right">
          {canManageSettings && (
            <div className="header-backup-actions">
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => importInputRef.current?.click()}
                title="Importar y combinar configuración"
              >
                ⬇ IMPORTAR
              </button>
              <input
                ref={importInputRef}
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={e => {
                  if (e.target.files?.[0]) handleImportBackupFile(e.target.files[0]);
                  e.target.value = '';
                }}
              />
              <button
                className="btn btn-ghost btn-sm"
                onClick={handleExportBackup}
                title="Exportar configuración completa"
              >
                ⬆ EXPORTAR
              </button>
            </div>
          )}

          {session && (
            <div className="header-user">
              <span className="header-user-name">{session.user.nombre}</span>
              <span className={`header-role-badge role-${session.user.role}`}>
                {session.user.role.toUpperCase()}
              </span>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => logout()}
                title="Cerrar sesión"
              >
                SALIR
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
