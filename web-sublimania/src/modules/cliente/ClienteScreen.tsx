// ============================================================
//  modules/cliente/ClienteScreen.tsx — Dashboard cliente
// ============================================================
import { useState, useEffect } from 'react';
import { useTeamsStore } from '../../store/useTeamsStore';
import { usePortalStore } from '../../store/usePortalStore';
import { useAuthStore } from '../../store/useAuthStore';
import type { TeamEntry } from '../../types';

interface Props {
  onToast: (msg: string, type: 'ok' | 'error') => void;
}

function useCountdown(expiresAt: string | null) {
  const [remaining, setRemaining] = useState<number | null>(null);
  useEffect(() => {
    if (!expiresAt) { setRemaining(null); return; }
    const tick = () => setRemaining(Math.max(0, new Date(expiresAt).getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  return remaining;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Vencido';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${Math.floor(s % 60)}s`;
}

function StatusBadge({ status }: { status: string }) {
  const label = status === 'collecting' ? 'RECOLECTANDO'
              : status === 'approved'   ? 'APROBADO'
              : status.toUpperCase();
  return <span className={`cliente-status-badge cliente-status-${status}`}>{label}</span>;
}

function TeamCountdown({ expiresAt }: { expiresAt: string | null }) {
  const remaining = useCountdown(expiresAt);
  if (remaining === null) return null;
  const isUrgent = remaining < 3_600_000;
  return (
    <div className={`cliente-countdown ${isUrgent ? 'cliente-countdown-urgent' : ''}`}>
      ⏱ {remaining === 0 ? 'Vencido' : `Cierra en ${formatCountdown(remaining)}`}
    </div>
  );
}

function PendingPlayersPanel({
  teamId, token, status, onApprove,
}: { teamId: string; token: string | null; status: string; onApprove: () => Promise<void> }) {
  const { pendingByTeam, loadPendingPlayers, deletePlayer, loading } = usePortalStore();
  const players = pendingByTeam[teamId];
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    if (!players) loadPendingPlayers(teamId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  if (!players || loading) return <div className="cliente-pending-loading">Cargando jugadores...</div>;

  async function handleApprove() {
    setApproving(true);
    try { await onApprove(); } finally { setApproving(false); }
  }

  const canApprove = status === 'collecting' && token && players.length > 0;

  return (
    <div className="cliente-pending-panel">
      {players.length === 0 ? (
        <p className="cliente-pending-empty">Sin jugadores pendientes</p>
      ) : (
        <table className="cliente-pending-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Cédula</th>
              <th>Nombre</th>
              <th>Camiseta</th>
              <th>Núm.</th>
              <th>Talla</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {players.map(p => (
              <tr key={p.position} className={p.player_status === 'additional' ? 'cliente-row-additional' : ''}>
                <td>{p.position + 1}</td>
                <td>{p.cedula}</td>
                <td>{p.nombre}</td>
                <td>{p.nombre_camiseta}</td>
                <td>{p.numero}</td>
                <td>{p.talla}</td>
                <td>
                  <span className={`cliente-player-badge cliente-player-${p.player_status}`}>
                    {p.player_status === 'additional' ? '+EXTRA' : 'NUEVO'}
                  </span>
                </td>
                <td>
                  <button
                    className="btn btn-ghost btn-xs cliente-del-btn"
                    title="Eliminar jugador"
                    onClick={() => deletePlayer(teamId, p.position)}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {canApprove && (
        <button
          className="btn btn-primary btn-sm cliente-approve-btn"
          onClick={handleApprove}
          disabled={approving}
        >
          {approving ? 'Aprobando...' : `✓ APROBAR EQUIPO (${players.length} jugadores)`}
        </button>
      )}
    </div>
  );
}

function TeamCard({ team, onToast }: { team: TeamEntry; onToast: Props['onToast'] }) {
  const { approvePortal } = usePortalStore();
  const [expanded, setExpanded] = useState(false);

  const portalUrl = team.portalToken
    ? `${window.location.origin}/portal/${team.portalToken}`
    : null;

  function copyLink() {
    if (!portalUrl) return;
    navigator.clipboard.writeText(portalUrl)
      .then(() => onToast('Enlace copiado', 'ok'))
      .catch(() => onToast('No se pudo copiar', 'error'));
  }

  async function handleApprove() {
    if (!team.portalToken) return;
    try {
      await approvePortal(team.id, team.portalToken);
      onToast(`Equipo "${team.nombre}" aprobado`, 'ok');
    } catch {
      onToast('Error al aprobar el equipo', 'error');
    }
  }

  return (
    <div className={`cliente-card cliente-card-${team.portalStatus}`}>
      <div className="cliente-card-top">
        <div className="cliente-card-info">
          <div className="cliente-card-name">{team.nombre}</div>
          <StatusBadge status={team.portalStatus} />
          <TeamCountdown expiresAt={team.portalExpiry} />
        </div>
        <div className="cliente-card-actions">
          {portalUrl && team.portalStatus === 'collecting' && (
            <button className="btn btn-ghost btn-sm" onClick={copyLink} title="Copiar enlace del formulario">
              🔗 COPIAR ENLACE
            </button>
          )}
          <button
            className={`btn btn-sm ${expanded ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setExpanded(v => !v)}
          >
            {expanded ? '▲ OCULTAR' : '▼ VER JUGADORES'}
          </button>
        </div>
      </div>

      {expanded && (
        <PendingPlayersPanel
          teamId={team.id}
          token={team.portalToken}
          status={team.portalStatus}
          onApprove={handleApprove}
        />
      )}
    </div>
  );
}

export function ClienteScreen({ onToast }: Props) {
  const session  = useAuthStore(s => s.session);
  const teams    = useTeamsStore(s => s.teams);
  const { createPortalTeam } = usePortalStore();

  const userId  = session?.user.id ?? '';
  const myTeams = teams.filter(t => t.createdBy === userId);

  const [showModal, setShowModal]   = useState(false);
  const [newNombre, setNewNombre]   = useState('');
  const [newExpiry, setNewExpiry]   = useState('');
  const [creating,  setCreating]    = useState(false);

  function openModal() { setNewNombre(''); setNewExpiry(''); setShowModal(true); }

  async function handleCreate() {
    const nombre = newNombre.trim();
    if (!nombre) { onToast('Ingresá un nombre para el equipo', 'error'); return; }
    setCreating(true);
    const expiresAt = newExpiry ? new Date(newExpiry).toISOString() : null;
    const token = await createPortalTeam(nombre, expiresAt);
    setCreating(false);
    if (!token) { onToast('Error al crear el equipo', 'error'); return; }
    setShowModal(false);
    onToast(`Equipo "${nombre}" creado`, 'ok');
  }

  return (
    <div className="screen cliente-screen">
      <div className="cliente-header">
        <div>
          <h1 className="cliente-title">MIS EQUIPOS</h1>
          <p className="cliente-sub">Bienvenido, {session?.user.nombre}</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openModal}>
          + NUEVO EQUIPO
        </button>
      </div>

      {myTeams.length === 0 ? (
        <div className="cliente-empty">
          <div className="cliente-empty-icon">📋</div>
          <div className="cliente-empty-title">AÚN NO TENÉS EQUIPOS</div>
          <div className="cliente-empty-sub">Creá tu primer equipo para generar un enlace de registro</div>
          <button className="btn btn-primary" onClick={openModal}>+ NUEVO EQUIPO</button>
        </div>
      ) : (
        <div className="cliente-list">
          {myTeams.map(team => (
            <TeamCard key={team.id} team={team} onToast={onToast} />
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-title">NUEVO EQUIPO</div>

            <label className="modal-label">NOMBRE DEL EQUIPO</label>
            <input
              className="input-global"
              style={{ width: '100%', marginBottom: '1rem' }}
              type="text"
              placeholder="Ej: TIGRES FC"
              value={newNombre}
              onChange={e => setNewNombre(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              autoFocus
            />

            <label className="modal-label">FECHA LÍMITE (OPCIONAL)</label>
            <input
              className="input-global"
              style={{ width: '100%', marginBottom: '1.25rem' }}
              type="datetime-local"
              value={newExpiry}
              onChange={e => setNewExpiry(e.target.value)}
            />

            <button
              className="btn btn-primary btn-sm"
              style={{ width: '100%' }}
              onClick={handleCreate}
              disabled={creating}
            >
              {creating ? 'Creando...' : 'CREAR Y GENERAR ENLACE'}
            </button>

            <button
              className="btn btn-ghost btn-sm modal-close"
              onClick={() => setShowModal(false)}
            >
              CANCELAR
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
