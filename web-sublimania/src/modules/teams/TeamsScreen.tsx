// ============================================================
//  modules/teams/TeamsScreen.tsx — Lista y gestión de equipos
// ============================================================
import { useState, type CSSProperties } from 'react';
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

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2)  return 'ahora';
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'ayer';
  if (days < 30)  return `hace ${days} días`;
  return `hace ${Math.floor(days / 30)} mes${Math.floor(days / 30) > 1 ? 'es' : ''}`;
}

function getConfiguredCount(entry: TeamEntry): number {
  return entry.tallas.filter(t => {
    const rules = entry.tallaRules[t];
    if (!rules) return false;
    return Object.values(rules).some(v => v === 'SI');
  }).length;
}

function lastExportInfo(entry: TeamEntry): { relative: string; full: string; tallas: string } | null {
  const entries = Object.entries(entry.exportHistory);
  if (entries.length === 0) return null;
  entries.sort((a, b) => new Date(b[1].exportedAt).getTime() - new Date(a[1].exportedAt).getTime());
  const [, { exportedAt }] = entries[0];
  const tallas = entries.map(([t]) => t).join(', ');
  return { relative: formatRelative(exportedAt), full: formatDate(exportedAt), tallas };
}

const EMPTY_ENTRY: TeamEntry = {
  id: '', nombre: '', createdAt: '', updatedAt: '',
  players: [], tallas: [], tallaRules: {}, overrides: {},
  globalConfig: { EQUIPO: '', NOTAS: '' }, exportHistory: {},
  portalStatus: 'none', createdBy: null, portalToken: null, portalExpiry: null,
};

export function TeamsScreen({ onToast }: Props) {
  const { teams, activeTeamId, baseTeamId, switchTeam, deleteTeam, setBaseTeam, createTeam } = useTeamsStore();
  const { loadFromEntry } = useTeamStore();
  const canManageSettings = usePermission('settings:manage');

  // Paginación — active team shown as featured, paginate the rest
  const PAGE_SIZE = 16;
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
    t => Object.keys(t.tallaRules).length > 0
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
    const validBase = teamsWithRules.find(t => t.id === baseTeamId);
    setSourceTeamId(validBase?.id ?? '');
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
    const portalDefaults = { portalStatus: 'none' as const, createdBy: null, portalToken: null, portalExpiry: null };
    const id = createTeam({
      nombre,
      players: [], tallas, tallaRules, overrides: {},
      globalConfig, exportHistory: {}, ...portalDefaults,
    });
    useTeamStore.getState().loadFromEntry({
      id, nombre, createdAt: '', updatedAt: '',
      players: [], tallas, tallaRules, overrides: {},
      globalConfig, exportHistory: {}, ...portalDefaults,
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
        <button className="btn btn-primary btn-sm" onClick={openNewModal}>+ NUEVO EQUIPO</button>
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
                  {!isEmpty && (() => {
                    const exp = lastExportInfo(featured);
                    return exp
                      ? <span title={exp.full}>✓ exportado {exp.relative} · {exp.tallas}</span>
                      : <span>Sin exportaciones</span>;
                  })()}
                </div>
                {featured.tallas.length > 0 && (() => {
                  const configured = getConfiguredCount(featured);
                  const pct = Math.round((configured / featured.tallas.length) * 100);
                  return (
                    <div className="team-card-progress">
                      <div className="team-card-progress-bar" style={{ width: `${pct}%` }} />
                      <span className="team-card-progress-label">{configured}/{featured.tallas.length} tallas configuradas</span>
                    </div>
                  );
                })()}
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
                    <button className="btn btn-ghost btn-sm" onClick={() => handleLoadPlayers(featured)}>
                      🔄 RE-CARGAR
                    </button>
                  </>
                )}
                <button
                  className={`btn btn-ghost btn-sm btn-base-team ${baseTeamId === featured.id ? 'is-base' : ''}`}
                  style={{ color: baseTeamId === featured.id ? '#f5a623' : undefined }}
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
          {pagedTeams.map((entry, idx) => {
            const isEmpty = entry.players.length === 0;
            const configured = getConfiguredCount(entry);
            return (
              <div
                key={entry.id}
                className={`team-card stagger-item ${isEmpty ? 'empty' : ''}`}
                style={{ '--i': idx } as CSSProperties}
              >
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
                {entry.tallas.length > 0 && (
                  <div className="team-card-progress">
                    <div className="team-card-progress-bar" style={{ width: `${Math.round((configured / entry.tallas.length) * 100)}%` }} />
                    <span className="team-card-progress-label">{configured}/{entry.tallas.length} tallas configuradas</span>
                  </div>
                )}
                {!isEmpty && (() => {
                  const exp = lastExportInfo(entry);
                  return <div className="team-card-export">{exp ? `✓ ${exp.relative} · ${exp.tallas}` : 'Sin exportaciones'}</div>;
                })()}
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
                        {t.nombre}{baseTeamId === t.id ? ' ★' : ''}
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
