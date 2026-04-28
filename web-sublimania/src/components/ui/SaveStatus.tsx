// ============================================================
//  components/ui/SaveStatus.tsx — Hook de estado de guardado
// ============================================================
import type { ReactNode } from 'react';
import { useTeamsStore } from '../../store/useTeamsStore';
import { useTeamStore, buildTeamEntryFromWorkingStore } from '../../store/useTeamStore';

interface SaveStatusData {
  statusClass: string;
  statusContent: ReactNode;
  handleSaveAndGoTeams: () => void;
}

export function useSaveStatus(): SaveStatusData {
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
  let statusContent: ReactNode = <span className="save-time">Sin equipo activo</span>;

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

  return { statusClass, statusContent, handleSaveAndGoTeams };
}
