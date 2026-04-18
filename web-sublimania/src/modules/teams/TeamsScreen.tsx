// ============================================================
//  modules/teams/TeamsScreen.tsx — Lista y gestión de equipos
// ============================================================
import { useState } from 'react';
import { useTeamsStore, saveActiveTeam } from '../../store/useTeamsStore';
import { useTeamStore } from '../../store/useTeamStore';
import { getDefaultGlobal, buildEmptyRules } from '../../utils/schema';
import { ConfirmButton } from '../../components/ui/ConfirmButton';
import { usePermission } from '../../hooks/usePermission';
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
  const { teams, activeTeamId, baseTeamId, switchTeam, deleteTeam, setBaseTeam, createTeam } = useTeamsStore();
  const { setScreen, loadFromEntry } = useTeamStore();
  const canManageSettings = usePermission('settings:manage');

  // Paginación — active team shown as featured, paginate the rest
  const PAGE_SIZE = 8;
  const [page, setPage] = useState(1);
  const otherTeams = teams.filter(t => t.id !== activeTeamId);
  const totalPages = Math.ceil(otherTeams.length / PAGE_SIZE);
  const pagedTeams = otherTeams.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Estado del modal "nuevo equipo"
  const [showNewModal, setShowNewModal] = useState(false);
  const [newNombre, setNewNombre] = useState('');
  const [sourceTeamId, setSourceTeamId] = useState('');

  // Equipos que tienen al menos una talla con reglas configuradas
  const teamsWithRules = teams.filter(
    t => t.tallas.length > 0 && Object.keys(t.tallaRules).length > 0
  );

  function handleOpen(entry: TeamEntry) {
    saveActiveTeam();
    switchTeam(entry.id);
    loadFromEntry(entry, 'configure');
  }

  function handleLoadPlayers(entry: TeamEntry) {
    saveActiveTeam();
    switchTeam(entry.id);
    useTeamStore.getState().loadFromEntry(entry, 'upload');
  }

  function openNewModal() {
    setNewNombre('');
    setSourceTeamId(baseTeamId ?? '');
    setShowNewModal(true);
  }

  function getSourceRules(): { tallas: string[]; tallaRules: TeamEntry['tallaRules'] } | null {
    if (!sourceTeamId) return null;
    const src = teams.find(t => t.id === sourceTeamId);
    if (!src) return null;
    return { tallas: src.tallas, tallaRules: src.tallaRules };
  }

  function handleCreateWithExcel() {
    saveActiveTeam();
    const source = getSourceRules();
    // Cargar entrada vacía y luego sobrescribir las reglas del equipo fuente
    // para que UploadScreen las preserve al importar jugadores con tallas coincidentes
    loadFromEntry(EMPTY_ENTRY, 'upload');
    if (source) {
      useTeamStore.setState({ tallas: source.tallas, tallaRules: source.tallaRules });
    }
    useTeamsStore.setState({ activeTeamId: null });
    setShowNewModal(false);
  }

  function handleCreateEmpty() {
    const nombre = newNombre.trim();
    if (!nombre) {
      onToast('Ingresá un nombre para el equipo', 'error');
      return;
    }
    saveActiveTeam();
    const source = getSourceRules();
    const globalConfig = { ...getDefaultGlobal(), EQUIPO: nombre };
    const tallaRules = source ? source.tallaRules : {};
    const tallas = source ? source.tallas : [];
    const id = createTeam({
      nombre,
      players: [], tallas, tallaRules, overrides: {},
      globalConfig, exportHistory: {},
    });
    useTeamStore.getState().loadFromEntry({
      id, nombre, createdAt: '', updatedAt: '',
      players: [], tallas, tallaRules, overrides: {},
      globalConfig, exportHistory: {},
    }, 'configure');
    setShowNewModal(false);
    const suffix = source ? ` (reglas copiadas de "${teams.find(t => t.id === sourceTeamId)?.nombre}")` : '';
    onToast(`Equipo "${nombre}" creado${suffix}`, 'ok');
  }

  function handleDelete(id: string) {
    if (!confirm('¿Eliminar este equipo? Esta acción no se puede deshacer.')) return;
    if (id === activeTeamId) {
      useTeamStore.getState().loadFromEntry(EMPTY_ENTRY, 'teams');
    }
    deleteTeam(id);
    onToast('Equipo eliminado', 'ok');
  }

  // Suprimir advertencia de buildEmptyRules no usado — lo usa UploadScreen
  void buildEmptyRules;

  return (
    <div className="screen teams-screen">
      <div className="teams-header">
        <h1 className="teams-title">EQUIPOS</h1>
        <div className="teams-actions">
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
        <>
        {/* ── Featured active team ───────────────────────────── */}
        {(() => {
          const featured = teams.find(t => t.id === activeTeamId);
          if (!featured) return null;
          const isEmpty = featured.players.length === 0;
          return (
            <div className="team-card-featured">
              <div className="team-card-featured-info">
                <div className="team-card-featured-label">▶ EQUIPO ACTIVO</div>
                <div className="team-card-featured-name">{featured.nombre || 'Sin nombre'}</div>
                <div className="team-card-featured-meta">
                  <span><strong>{featured.players.length}</strong> jugadores · <strong>{featured.tallas.length}</strong> tallas{featured.tallas.length > 0 ? `: ${featured.tallas.join(', ')}` : ''}</span>
                  {!isEmpty && <span>{exportSummary(featured)}</span>}
                </div>
                <div className="team-card-featured-dates">
                  Modificado: {formatDate(featured.updatedAt)}
                </div>
              </div>
              <div className="team-card-featured-actions">
                {isEmpty ? (
                  <button className="btn btn-primary btn-sm" onClick={() => handleLoadPlayers(featured)}>
                    📂 CARGAR JUGADORES
                  </button>
                ) : (
                  <>
                    <button className="btn btn-primary btn-sm" onClick={() => handleOpen(featured)}>
                      ✏ CONTINUAR
                    </button>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'rgba(255,255,255,0.55)', borderColor: 'rgba(255,255,255,0.2)' }} onClick={() => handleLoadPlayers(featured)}>
                      🔄 RE-CARGAR
                    </button>
                  </>
                )}
                <button
                  className={`btn btn-ghost btn-sm btn-base-team ${baseTeamId === featured.id ? 'is-base' : ''}`}
                  style={{ color: baseTeamId === featured.id ? '#f5a623' : 'rgba(255,255,255,0.35)', borderColor: 'rgba(255,255,255,0.15)' }}
                  title={baseTeamId === featured.id ? 'Quitar como equipo base' : 'Marcar como equipo base'}
                  onClick={() => setBaseTeam(featured.id)}
                >
                  {baseTeamId === featured.id ? '★' : '☆'}
                </button>
                {canManageSettings && (
                  <ConfirmButton
                    className="btn btn-ghost btn-sm btn-danger"
                    title="Eliminar equipo"
                    onConfirm={() => handleDelete(featured.id)}
                  />
                )}
              </div>
            </div>
          );
        })()}

        {/* ── Rest of teams ──────────────────────────────────── */}
        {pagedTeams.length > 0 && (
        <div className="teams-grid">
          {pagedTeams.map(entry => {
            const isEmpty = entry.players.length === 0;
            return (
              <div key={entry.id} className={`team-card ${isEmpty ? 'empty' : ''}`}>
                <div className="team-card-header">
                  <div className="team-card-name">{entry.nombre || 'Sin nombre'}</div>
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
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
                        ▶ ABRIR
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="btn btn-primary btn-sm" onClick={() => handleOpen(entry)}>
                        ▶ ABRIR
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleLoadPlayers(entry)}>
                        🔄 RE-CARGAR
                      </button>
                    </>
                  )}
                  <button
                    className={`btn btn-ghost btn-sm btn-base-team ${baseTeamId === entry.id ? 'is-base' : ''}`}
                    title={baseTeamId === entry.id ? 'Quitar como equipo base' : 'Marcar como equipo base'}
                    onClick={() => setBaseTeam(entry.id)}
                  >
                    {baseTeamId === entry.id ? '★' : '☆'}
                  </button>
                  {canManageSettings && (
                    <ConfirmButton
                      className="btn btn-ghost btn-sm btn-danger"
                      title="Eliminar equipo"
                      onConfirm={() => handleDelete(entry.id)}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
        )}
        {totalPages > 1 && (
          <div className="teams-pagination">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                className={`pagination-btn ${page === n ? 'active' : ''}`}
                onClick={() => setPage(n)}
              >
                {n}
              </button>
            ))}
          </div>
        )}
        </>
      )}

      <div className="teams-footer">
        {teams.length > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={() => {
            const active = useTeamsStore.getState().getActiveTeam();
            if (active && active.players.length > 0) { saveActiveTeam(); setScreen('configure'); }
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
              <input
                className="input-global"
                style={{ width: '100%', marginBottom: '0.5rem' }}
                type="text"
                placeholder="Nombre del equipo"
                value={newNombre}
                onChange={e => setNewNombre(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateEmpty()}
                autoFocus
              />
              {teamsWithRules.length > 0 && (
                <>
                  <div className="modal-option-title" style={{ marginBottom: '0.4rem' }}>
                    COPIAR REGLAS DE (OPCIONAL)
                  </div>
                  <select
                    className="input-global"
                    style={{ width: '100%', marginBottom: '0.5rem' }}
                    value={sourceTeamId}
                    onChange={e => setSourceTeamId(e.target.value)}
                  >
                    <option value="">— Sin copiar —</option>
                    {teamsWithRules.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.nombre} ({t.tallas.join(', ')})
                      </option>
                    ))}
                  </select>
                </>
              )}
              <button className="btn btn-primary btn-sm" style={{ width: '100%' }} onClick={handleCreateEmpty}>
                CREAR
              </button>
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
