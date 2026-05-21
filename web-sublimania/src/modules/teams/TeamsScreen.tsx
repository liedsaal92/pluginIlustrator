// ============================================================
//  modules/teams/TeamsScreen.tsx — Lista y gestión de equipos
// ============================================================
import { useState, type CSSProperties } from 'react';
import { useTeamsStore, saveActiveTeam } from '../../store/useTeamsStore';
import { useTeamStore } from '../../store/useTeamStore';
import { useClientesStore } from '../../store/useClientesStore';
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
  globalConfig: { EQUIPO: '', NOTAS: '', clienteIdPant: '', moldeIdPant: '' },
  clienteId: null,
  exportHistory: {},
  portalStatus: 'none', createdBy: null, portalToken: null, portalExpiry: null,
};

export function TeamsScreen({ onToast }: Props) {
  const { teams, activeTeamId, baseTeamId, switchTeam, deleteTeam, setBaseTeam, createTeam, saveTeam } = useTeamsStore();
  const { loadFromEntry } = useTeamStore();
  const { clientes } = useClientesStore();
  const canManageSettings = usePermission('settings:manage');

  // Estado del modal "nuevo equipo"
  const [showNewModal, setShowNewModal] = useState(false);
  const [newNombre, setNewNombre] = useState('');
  const [sourceTeamId, setSourceTeamId] = useState('');
  const [newClienteId, setNewClienteId] = useState('');

  // Búsqueda
  const [teamSearch, setTeamSearch] = useState('');

  // Grupos de clientes expandidos (por defecto todos)
  const [collapsedClientes, setCollapsedClientes] = useState<Set<string>>(new Set());

  // Equipos que tienen al menos una talla con reglas configuradas
  const teamsWithRules = teams.filter(
    t => Object.keys(t.tallaRules).length > 0
  );

  // Equipos distintos al activo, para la vista agrupada
  const otherTeams = teams.filter(t => t.id !== activeTeamId);

  const q = teamSearch.toLowerCase().trim();
  const filteredTeams = q
    ? otherTeams.filter(t => {
        if (t.nombre.toLowerCase().includes(q)) return true;
        if (t.clienteId) {
          const clienteNombre = clientes.find(c => c.id === t.clienteId)?.nombre ?? '';
          if (clienteNombre.toLowerCase().includes(q)) return true;
        }
        return false;
      })
    : otherTeams;

  function toggleCliente(key: string) {
    setCollapsedClientes(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

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
    setNewClienteId('');
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
    loadFromEntry(EMPTY_ENTRY, 'upload');
    if (source) {
      useTeamStore.setState({ tallas: source.tallas, tallaRules: source.tallaRules });
    }
    useTeamStore.getState().setClienteId(newClienteId || null);
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
    const clienteId = newClienteId || null;
    const portalDefaults = { portalStatus: 'none' as const, createdBy: null, portalToken: null, portalExpiry: null };
    const id = createTeam({
      nombre,
      players: [], tallas, tallaRules, overrides: {},
      globalConfig, clienteId, exportHistory: {}, ...portalDefaults,
    });
    useTeamStore.getState().loadFromEntry({
      id, nombre, createdAt: '', updatedAt: '',
      players: [], tallas, tallaRules, overrides: {},
      globalConfig, clienteId, exportHistory: {}, ...portalDefaults,
    }, 'configure');
    setShowNewModal(false);
    const suffix = source ? ` (reglas copiadas de "${teams.find(t => t.id === sourceTeamId)?.nombre}")` : '';
    onToast(`Equipo "${nombre}" creado${suffix}`, 'ok');
  }

  function handleDelete(id: string) {
    if (!confirm('¿Eliminar este equipo? Esta acción no se puede deshacer.')) return;
    const wasActive = id === activeTeamId;
    deleteTeam(id);
    if (wasActive) {
      const { activeTeamId: nextId, teams: remaining } = useTeamsStore.getState();
      const nextTeam = nextId ? remaining.find(t => t.id === nextId) : null;
      useTeamStore.getState().loadFromEntry(nextTeam ?? EMPTY_ENTRY, 'teams');
    }
    onToast('Equipo eliminado', 'ok');
  }

  function handleAssignCliente(entry: TeamEntry, clienteId: string | null) {
    const updated = { ...entry, clienteId };
    // Update in master store optimistically + persist
    saveTeam(entry.id, updated);
    // If this is the active team, sync working store too
    if (entry.id === activeTeamId) {
      useTeamStore.getState().setClienteId(clienteId);
    }
  }

  // Suppress unused warning
  void buildEmptyRules;

  // ── Grouping logic ─────────────────────────────────────────────
  // Groups: one per client that has teams, then "Sin cliente" at end
  const clienteGroups = clientes
    .map(c => ({ cliente: c, teams: filteredTeams.filter(t => t.clienteId === c.id) }))
    .filter(g => g.teams.length > 0);
  const sinClienteTeams = filteredTeams.filter(t => !t.clienteId);

  // Inline client selector rendered inside each card
  function ClienteSelect({ entry }: { entry: TeamEntry }) {
    return (
      <select
        className="input-global"
        style={{ fontSize: '0.72rem', padding: '0.2rem 0.4rem', height: 'auto', marginTop: '0.3rem' }}
        value={entry.clienteId ?? ''}
        onChange={e => handleAssignCliente(entry, e.target.value || null)}
        onClick={e => e.stopPropagation()}
        title="Cliente"
      >
        <option value="">— Sin cliente —</option>
        {clientes.map(c => (
          <option key={c.id} value={c.id}>{c.nombre}</option>
        ))}
      </select>
    );
  }

  // Renders a single (non-featured) team card
  function TeamCard({ entry, idx }: { entry: TeamEntry; idx: number }) {
    const isEmpty = entry.players.length === 0;
    const configured = getConfiguredCount(entry);
    return (
      <div
        className={`team-card stagger-item ${isEmpty ? 'empty' : ''}`}
        style={{ '--i': idx } as CSSProperties}
      >
        <div className="team-card-header">
          <div className="team-card-name">{entry.nombre || 'Sin nombre'}</div>
          <div style={{ display: 'flex', gap: '0.3rem' }}>
            {isEmpty && <span className="team-empty-badge">VACÍO</span>}
          </div>
        </div>
        {clientes.length > 0 && <ClienteSelect entry={entry} />}
        <div className="team-card-meta" style={{ marginTop: '0.35rem' }}>
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
  }

  // Renders a collapsible client group
  function ClienteGroup({ label, groupKey, groupTeams }: { label: string; groupKey: string; groupTeams: TeamEntry[] }) {
    const collapsed = !q && collapsedClientes.has(groupKey);
    return (
      <div className="teams-cliente-group">
        <div
          className={`teams-cliente-group-header ${collapsed ? '' : 'expanded'}`}
          onClick={() => toggleCliente(groupKey)}
        >
          <span className="teams-cliente-group-label">{label}</span>
          <span className="teams-cliente-group-badge">{groupTeams.length} equipo{groupTeams.length !== 1 ? 's' : ''}</span>
          <span className="teams-cliente-group-chevron">{collapsed ? '▶' : '▼'}</span>
        </div>
        {!collapsed && (
          <div className="teams-grid teams-cliente-group-body">
            {groupTeams.map((entry, idx) => (
              <TeamCard key={entry.id} entry={entry} idx={idx} />
            ))}
          </div>
        )}
      </div>
    );
  }

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
                {clientes.length > 0 && (
                  <select
                    className="input-global"
                    style={{ fontSize: '0.72rem', padding: '0.2rem 0.4rem', height: 'auto', marginBottom: '0.4rem', maxWidth: '220px' }}
                    value={featured.clienteId ?? ''}
                    onChange={e => handleAssignCliente(featured, e.target.value || null)}
                    title="Cliente"
                  >
                    <option value="">— Sin cliente —</option>
                    {clientes.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                )}
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

        {/* ── Grouped by cliente ────────────────────────────── */}
        {otherTeams.length > 0 && (
          <div className="rules-search-bar" style={{ margin: '0.75rem 0' }}>
            <input
              className="rules-search-input"
              type="search"
              placeholder="Buscar por cliente o equipo…"
              value={teamSearch}
              onChange={e => setTeamSearch(e.target.value)}
            />
            {teamSearch && (
              <button className="rules-search-clear" onClick={() => setTeamSearch('')}>×</button>
            )}
          </div>
        )}
        {otherTeams.length > 0 && (
          q && filteredTeams.length === 0 ? (
            <div className="rules-search-empty">Sin resultados para "{teamSearch}"</div>
          ) : (
          <div className="teams-cliente-groups">
            {clienteGroups.map(g => (
              <ClienteGroup
                key={g.cliente.id}
                groupKey={g.cliente.id}
                label={g.cliente.nombre}
                groupTeams={g.teams}
              />
            ))}
            {sinClienteTeams.length > 0 && (
              <ClienteGroup
                groupKey="__sin_cliente__"
                label="SIN CLIENTE"
                groupTeams={sinClienteTeams}
              />
            )}
          </div>
          )
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

            {clientes.length > 0 && (
              <div style={{ marginBottom: '0.75rem' }}>
                <div className="modal-option-title" style={{ marginBottom: '0.4rem' }}>CLIENTE</div>
                <select
                  className="input-global"
                  style={{ width: '100%' }}
                  value={newClienteId}
                  onChange={e => setNewClienteId(e.target.value)}
                >
                  <option value="">— Sin cliente —</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>
            )}

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
