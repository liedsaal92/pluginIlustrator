// ============================================================
//  modules/configure/PlayerCard.tsx — Acordeón de un jugador
// ============================================================
import { useState } from 'react';
import { useTeamStore } from '../../store/useTeamStore';
import { useTallasStore } from '../../store/useTallasStore';
import { SCHEMA } from '../../utils/schema';
import { ElementCard } from './ElementCard';
import { PiezaTabs } from './PiezaTabs';
import type { PiezaKey } from '../../types';

const TALLA_COLORS = ['#E8462A', '#F5C842', '#4A9BE8', '#7B5CF0', '#1DBF73', '#F050A0', '#FF8C00', '#00CED1'];
const colorMap: Record<string, string> = {};
function tallaColor(talla: string): string {
  if (!colorMap[talla]) {
    colorMap[talla] = TALLA_COLORS[Object.keys(colorMap).length % TALLA_COLORS.length];
  }
  return colorMap[talla];
}

interface Props {
  idx: number;
}

export function PlayerCard({ idx }: Props) {
  const { players, overrides, getPlayerRules, hasOverride, setOverride, clearOverride, removePlayer, updatePlayer, expandedPlayer, setExpandedPlayer } = useTeamStore();
  const tallasPorCliente = useTallasStore(s => s.tallasPorCliente);
  const tallaOptions = [...new Set(
    Object.values(tallasPorCliente).flatMap(t => Object.keys(t))
  )].sort((a, b) => a.localeCompare(b));

  const expanded = expandedPlayer === idx;
  const [editing, setEditing] = useState(false);
  const [pieza, setPieza] = useState<PiezaKey>('frente');

  const player = players[idx];
  if (!player) return null;

  const rules = getPlayerRules(idx);
  const isOverridden = (key: string) => !!(overrides[idx] && overrides[idx][key] !== undefined);

  function handleEditSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    updatePlayer(idx, {
      NOMBRE: String(fd.get('NOMBRE') ?? '').trim(),
      NOMBRE_CAMISETA: String(fd.get('NOMBRE_CAMISETA') ?? '').trim(),
      NUMERO: String(fd.get('NUMERO') ?? '').trim(),
      TALLA: String(fd.get('TALLA') ?? '').trim().toUpperCase(),
    });
    setEditing(false);
  }

  return (
    <div className={`player-card ${hasOverride(idx) ? 'has-override' : ''}`}>
      <div className="player-card-header" onClick={() => !editing && setExpandedPlayer(expanded ? null : idx)}>
        <div className="player-info">
          <span className="player-talla-badge" style={{ background: tallaColor(player.TALLA) }}>
            {player.TALLA || '—'}
          </span>
          <span className="player-name">{player.NOMBRE}</span>
          {player.NOMBRE_CAMISETA && (
            <span className="player-camiseta">"{player.NOMBRE_CAMISETA}"</span>
          )}
        </div>
        <div className="player-meta">
          {player.NUMERO
            ? <span className="player-num">#{player.NUMERO}</span>
            : <span className="player-num-empty">S/N</span>
          }
          {hasOverride(idx) && <span className="override-badge">✎ OVERRIDE</span>}
          <button
            className="btn-edit-player"
            title="Editar datos del jugador"
            onClick={e => { e.stopPropagation(); setEditing(v => !v); setExpandedPlayer(null); }}
          >
            ✎
          </button>
          <button
            className="btn-del-player"
            title="Eliminar jugador"
            onClick={e => { e.stopPropagation(); removePlayer(idx); }}
          >
            ×
          </button>
          {!editing && <span className="player-toggle">{expanded ? '▲' : '▼'}</span>}
        </div>
      </div>

      {editing && (
        <form className="player-edit-form" onSubmit={handleEditSave} onClick={e => e.stopPropagation()}>
          <div className="player-edit-fields">
            <div className="player-edit-field">
              <label>NOMBRE</label>
              <input className="input-player" name="NOMBRE" defaultValue={player.NOMBRE} required />
            </div>
            <div className="player-edit-field">
              <label>NOMBRE CAMISETA</label>
              <input className="input-player" name="NOMBRE_CAMISETA" defaultValue={player.NOMBRE_CAMISETA} />
            </div>
            <div className="player-edit-field player-edit-field--sm">
              <label>NÚMERO</label>
              <input className="input-player" name="NUMERO" defaultValue={player.NUMERO} maxLength={3} />
            </div>
            <div className="player-edit-field player-edit-field--sm">
              <label>TALLA</label>
              <select className="input-player" name="TALLA" defaultValue={player.TALLA}>
                {tallaOptions.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="player-edit-actions">
            <button type="submit" className="btn btn-primary btn-sm">GUARDAR</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>CANCELAR</button>
          </div>
        </form>
      )}

      {expanded && !editing && (
        <div className="player-expanded">
          <div className="player-pieza-tabs">
            <PiezaTabs active={pieza} onChange={p => setPieza(p as PiezaKey)} size="sm" />
            <button
              className="btn btn-ghost btn-sm"
              onClick={e => { e.stopPropagation(); clearOverride(idx); }}
            >
              ↺ LIMPIAR OVERRIDE
            </button>
          </div>
          <div className="player-elements">
            {SCHEMA[pieza]?.elements.map(el => (
              <ElementCard
                key={el.id}
                el={el}
                rules={rules}
                mode="player"
                isOverridden={isOverridden}
                onChange={(key, val) => setOverride(idx, key, val)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
