// ============================================================
//  components/ui/SaveStatus.tsx — Estado de guardado auto + acceso a equipos
// ============================================================
import { useTeamsStore } from '../../store/useTeamsStore';
import { useTeamStore, buildTeamEntryFromWorkingStore } from '../../store/useTeamStore';

interface Props {
  onToast: (msg: string, type: 'ok' | 'error') => void;
}

export function SaveStatus({ onToast: _onToast }: Props) {
  const { activeTeamId, getActiveTeam, saveTeam } = useTeamsStore();
  const { setScreen } = useTeamStore();

  const activeTeam = getActiveTeam();

  function handleSaveAndGoTeams() {
    if (activeTeamId) {
      const partial = buildTeamEntryFromWorkingStore();
      saveTeam(activeTeamId, {
        ...partial,
        exportHistory: activeTeam?.exportHistory ?? {},
      });
    }
    setScreen('teams');
  }

  let statusClass = 'save-status save-none';
  let statusContent = <span className="save-time">Sin equipo activo</span>;

  if (activeTeam) {
    const d = new Date(activeTeam.updatedAt);
    const label = d.toLocaleDateString('es-AR') + ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    statusClass = 'save-status save-ok';
    statusContent = (
      <>
        <span className="save-file">{activeTeam.nombre || 'Sin nombre'}</span>
        <span className="save-time">Guardado {label}</span>
      </>
    );
  }

  return (
    <div className="header-file-actions">
      <div className={statusClass}>{statusContent}</div>
      <button
        className="btn btn-ghost btn-sm"
        title="Ver todos los equipos"
        onClick={handleSaveAndGoTeams}
      >
        ☰ EQUIPOS
      </button>
    </div>
  );
}
