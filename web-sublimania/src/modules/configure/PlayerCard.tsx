// ============================================================
//  modules/configure/PlayerCard.tsx — Acordeón de un jugador
// ============================================================
import { useState } from 'react';
import { useTeamStore } from '../../store/useTeamStore';
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
  const { players, overrides, getPlayerRules, hasOverride, setOverride, clearOverride } = useTeamStore();
  const [expanded, setExpanded] = useState(false);
  const [pieza, setPieza] = useState<PiezaKey>('frente');

  const player = players[idx];
  if (!player) return null;

  const rules = getPlayerRules(idx);
  const isOverridden = (key: string) => !!(overrides[idx] && overrides[idx][key] !== undefined);

  return (
    <div className={`player-card ${hasOverride(idx) ? 'has-override' : ''}`}>
      <div className="player-card-header" onClick={() => setExpanded(v => !v)}>
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
          <span className="player-dims">{player.ALTO}×{player.ANCHO} cm</span>
          {hasOverride(idx) && <span className="override-badge">✎ OVERRIDE</span>}
          <span className="player-toggle">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
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
