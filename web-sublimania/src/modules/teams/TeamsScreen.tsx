// ============================================================
//  modules/teams/TeamsScreen.tsx — Lista y gestión de equipos
// ============================================================
import { useState } from 'react';
import { useTeamsStore } from '../../store/useTeamsStore';
import { useTeamStore, buildTeamEntryFromWorkingStore } from '../../store/useTeamStore';
import { exportBackup, importBackup } from '../../utils/configFile';
import { getDefaultGlobal, buildEmptyRules } from '../../utils/schema';
import type { TeamEntry } from '../../types';

interface Props {
  onToast: (msg: string, type: 'ok' | 'error') => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR') + ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

function exportSummary(entry: TeamEntry): string {
  const count = Object.keys(entry.exportHistory).length;
  if (count === 0) return 'Sin exportaciones';
  const tallas = Object.keys(entry.exportHistory).join(', ');
  return `${count} talla${count !== 1 ? 's' : ''} exportadas: ${tallas}`;
}

const EMPTY_ENTRY: TeamEntry = {
  id: '', nombre: '', createdAt: '', updatedAt: '',
  players: [], tallas: [], tallaRules: {}, overrides: {},
  globalConfig: { EQUIPO: '', NOTAS: '' }, exportHistory: {},
};

export function TeamsScreen({ onToast }: Props) {
  const { teams, activeTeamId, switchTeam, deleteTeam, replaceAll, createTeam } = useTeamsStore();
  const { setScreen, loadFromEntry } = useTeamStore();

  // Estado del modal "nuevo equipo"
  const [showNewModal, setShowNewModal] = useState(false);
  const [newNombre, setNewNombre] = useState('');

  // Guarda el equipo activo antes de cualquier navegación
  function saveActive() {
    const { activeTeamId: aid, getActiveTeam, saveTeam } = useTeamsStore.getState();
    if (!aid) return;
    const current = getActiveTeam();
    const partial = buildTeamEntryFromWorkingStore();
    saveTeam(aid, { ...partial, exportHistory: current?.exportHistory ?? {} });
  }

  function handleOpen(entry: TeamEntry) {
    saveActive();
    switchTeam(entry.id);
    loadFromEntry(entry, 'configure');
  }

  function handleLoadPlayers(entry: TeamEntry) {
    saveActive();
    switchTeam(entry.id);
    useTeamStore.getState().loadFromEntry(entry, 'upload');
  }

  function openNewModal() {
    setNewNombre('');
    setShowNewModal(true);
  }

  function handleCreateWithExcel() {
    saveActive();
    loadFromEntry(EMPTY_ENTRY, 'upload');
    useTeamsStore.setState({ activeTeamId: null });
    setShowNewModal(false);
  }

  function handleCreateEmpty() {
    const nombre = newNombre.trim();
    if (!nombre) {
      onToast('Ingresá un nombre para el equipo', 'error');
      return;
    }
    saveActive();
    const globalConfig = { ...getDefaultGlobal(), EQUIPO: nombre };
    const id = createTeam({
      nombre,
      players: [], tallas: [], tallaRules: {}, overrides: {},
      globalConfig, exportHistory: {},
    });
    // Cargar en working store
    useTeamStore.getState().loadFromEntry({
      id, nombre, createdAt: '', updatedAt: '',
      players: [], tallas: [], tallaRules: {}, overrides: {},
      globalConfig, exportHistory: {},
    }, 'configure');
    setShowNewModal(false);
    onToast(`Equipo "${nombre}" creado`, 'ok');
  }

  function handleDelete(id: string) {
    if (!confirm('¿Eliminar este equipo? Esta acción no se puede deshacer.')) return;
    if (id === activeTeamId) {
      useTeamStore.getState().loadFromEntry(EMPTY_ENTRY, 'teams');
    }
    deleteTeam(id);
    onToast('Equipo eliminado', 'ok');
  }

  async function handleExportBackup() {
    saveActive();
    const { teams: allTeams } = useTeamsStore.getState();
    try {
      await exportBackup(allTeams);
      onToast('Respaldo exportado', 'ok');
    } catch (e) {
      if ((e as DOMException).name !== 'AbortError') {
        onToast('Error al exportar: ' + (e as Error).message, 'error');
      }
    }
  }

  async function handleImportBackup() {
    try {
      const importedTeams = await importBackup();
      replaceAll(importedTeams);
      const first = importedTeams[0];
      if (first) loadFromEntry(first, 'configure');
      onToast(`${importedTeams.length} equipo${importedTeams.length !== 1 ? 's' : ''} importados`, 'ok');
    } catch (e) {
      if ((e as DOMException).name !== 'AbortError') {
        onToast('Error al importar: ' + (e as Error).message, 'error');
      }
    }
  }

  // Suprimir advertencia de buildEmptyRules no usado — lo usa UploadScreen
  void buildEmptyRules;

  return (
    <div className="screen teams-screen">
      <div className="teams-header">
        <h1 className="teams-title">SUBLIMANIA</h1>
        <div className="teams-actions">
          <button className="btn btn-ghost btn-sm" onClick={handleImportBackup} title="Importar respaldo JSON">
            📂 IMPORTAR
          </button>
          <button className="btn btn-ghost btn-sm" onClick={handleExportBackup} title="Exportar respaldo de todos los equipos">
            💾 RESPALDAR
          </button>
          <button className="btn btn-primary" onClick={openNewModal}>
            + NUEVO EQUIPO
          </button>
        </div>
      </div>

      {teams.length === 0 ? (
        <div className="teams-empty">
          <div className="teams-empty-icon">📋</div>
          <div className="teams-empty-title">NO HAY EQUIPOS GUARDADOS</div>
          <div className="teams-empty-sub">Creá tu primer equipo para comenzar</div>
          <button className="btn btn-primary" onClick={openNewModal}>+ NUEVO EQUIPO</button>
        </div>
      ) : (
        <div className="teams-grid">
          {teams.map(entry => {
            const isActive = entry.id === activeTeamId;
            const isEmpty = entry.players.length === 0;
            return (
              <div key={entry.id} className={`team-card ${isActive ? 'active' : ''} ${isEmpty ? 'empty' : ''}`}>
                <div className="team-card-header">
                  <div className="team-card-name">{entry.nombre || 'Sin nombre'}</div>
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    {isActive && <span className="team-active-badge">ACTIVO</span>}
                    {isEmpty && <span className="team-empty-badge">VACÍO</span>}
                  </div>
                </div>
                <div className="team-card-meta">
                  <span>{entry.players.length} jugadores</span>
                  {!isEmpty && <span>{entry.tallas.length} tallas: {entry.tallas.join(', ')}</span>}
                </div>
                {!isEmpty && <div className="team-card-export">{exportSummary(entry)}</div>}
                <div className="team-card-dates">
                  <span>Creado: {formatDate(entry.createdAt)}</span>
                  <span>Modificado: {formatDate(entry.updatedAt)}</span>
                </div>
                <div className="team-card-btns">
                  {isEmpty ? (
                    <>
                      <button className="btn btn-primary btn-sm" onClick={() => handleLoadPlayers(entry)}>
                        📂 CARGAR JUGADORES
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleOpen(entry)}>
                        {isActive ? '✏ CONTINUAR' : '▶ ABRIR'}
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="btn btn-primary btn-sm" onClick={() => handleOpen(entry)}>
                        {isActive ? '✏ CONTINUAR' : '▶ ABRIR'}
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleLoadPlayers(entry)}>
                        🔄 RE-CARGAR
                      </button>
                    </>
                  )}
                  <button className="btn btn-ghost btn-sm btn-danger" onClick={() => handleDelete(entry.id)}>
                    🗑
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="teams-footer">
        {teams.length > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={() => {
            const active = useTeamsStore.getState().getActiveTeam();
            if (active && active.players.length > 0) { saveActive(); setScreen('configure'); }
            else onToast('No hay equipo activo con jugadores', 'error');
          }}>
            ← VOLVER AL EQUIPO ACTIVO
          </button>
        )}
      </div>

      {/* ── Modal nuevo equipo ─────────────────────────────── */}
      {showNewModal && (
        <div className="modal-overlay" onClick={() => setShowNewModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-title">NUEVO EQUIPO</div>

            <div className="modal-option" onClick={handleCreateWithExcel}>
              <div className="modal-option-icon">📊</div>
              <div className="modal-option-text">
                <div className="modal-option-title">CARGAR DESDE EXCEL</div>
                <div className="modal-option-sub">Importá el listado de jugadores desde un archivo .xlsx</div>
              </div>
            </div>

            <div className="modal-divider">ó</div>

            <div className="modal-empty-form">
              <div className="modal-option-title">CREAR EQUIPO VACÍO</div>
              <div className="modal-option-sub" style={{ marginBottom: '0.75rem' }}>
                Podrás cargar los jugadores después
              </div>
              <div className="modal-input-row">
                <input
                  className="input-global"
                  type="text"
                  placeholder="Nombre del equipo"
                  value={newNombre}
                  onChange={e => setNewNombre(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreateEmpty()}
                  autoFocus
                />
                <button className="btn btn-primary btn-sm" onClick={handleCreateEmpty}>
                  CREAR
                </button>
              </div>
            </div>

            <button className="btn btn-ghost btn-sm modal-close" onClick={() => setShowNewModal(false)}>
              CANCELAR
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
