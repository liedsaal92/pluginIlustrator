// ============================================================
//  modules/configure/PlayerCard.tsx — Acordeón de un jugador
// ============================================================
import { useState } from 'react';
import { useTeamStore } from '../../store/useTeamStore';
import { saveActiveTeam } from '../../store/useTeamsStore';
import { useTallasStore } from '../../store/useTallasStore';
import { SCHEMA, sortTallas, getGeneroTalla } from '../../utils/schema';
import { ElementCard } from './ElementCard';
import { PiezaTabs } from './PiezaTabs';
import { ConfirmButton } from '../../components/ui/ConfirmButton';
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
  const teamTallas       = useTeamStore(s => s.tallas);
  const tallasPorCliente = useTallasStore(s => s.tallasPorCliente);
  const tallaOptions = sortTallas([...new Set([
    ...teamTallas,
    ...Object.values(tallasPorCliente).flatMap(byMolde =>
      Object.values(byMolde).flatMap(byTalla => Object.keys(byTalla))
    ),
  ])]);
  const hTallas    = tallaOptions.filter(t => getGeneroTalla(t) === 'H');
  const mTallas    = tallaOptions.filter(t => getGeneroTalla(t) === 'M');
  const otraTallas = tallaOptions.filter(t => getGeneroTalla(t) === 'other');

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
      NOMBRE:          String(fd.get('NOMBRE') ?? '').trim(),
      NOMBRE_CAMISETA: String(fd.get('NOMBRE_CAMISETA') ?? '').trim(),
      NUMERO:          String(fd.get('NUMERO') ?? '').trim(),
      TALLA_CAMI:      String(fd.get('TALLA_CAMI') ?? '').trim().toUpperCase(),
      TALLA_PANT:      String(fd.get('TALLA_PANT') ?? '').trim().toUpperCase(),
    });
    saveActiveTeam();
    setEditing(false);
  }

  return (
    <div className={`player-card ${hasOverride(idx) ? 'has-override' : ''}`}>
      <div className="player-card-header" onClick={() => !editing && setExpandedPlayer(expanded ? null : idx)}>
        {/* Jersey number — left anchor */}
        <div className="player-num-col">
          <span className={`player-num-display${!player.NUMERO ? ' is-empty' : ''}`}>
            {player.NUMERO || '—'}
          </span>
        </div>

        {/* Name block */}
        <div className="player-main-info">
          <span className="player-name">{player.NOMBRE}</span>
          {player.NOMBRE_CAMISETA && (
            <span className="player-camiseta">"{player.NOMBRE_CAMISETA}"</span>
          )}
        </div>

        {/* Right meta + actions */}
        <div className="player-meta">
          <span className="player-talla-badge" style={{ background: tallaColor(player.TALLA_CAMI) }}>
            {player.TALLA_CAMI || '—'}{player.TALLA_PANT ? <span className="player-talla-tipo"> CAM</span> : null}
          </span>
          {player.TALLA_PANT && (
            <span className="player-talla-badge player-talla-badge--pant" style={{ background: tallaColor(player.TALLA_PANT) }}>
              {player.TALLA_PANT}<span className="player-talla-tipo"> PAN</span>
            </span>
          )}
          {hasOverride(idx) && <span className="override-badge">✎</span>}
          <div className="player-actions" onClick={e => e.stopPropagation()}>
            <button
              className="btn-edit-player"
              title="Editar datos del jugador"
              onClick={e => { e.stopPropagation(); setEditing(v => !v); setExpandedPlayer(null); }}
            >
              ✎
            </button>
            <ConfirmButton
              className="btn-del-player"
              title="Eliminar jugador"
              onConfirm={() => removePlayer(idx)}
              stopPropagation
            />
          </div>
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
              <label>T. CAMISETA *</label>
              <select className="input-player" name="TALLA_CAMI" defaultValue={player.TALLA_CAMI} required>
                <option value="">— elegir —</option>
                {hTallas.length > 0 && <optgroup label="♂ HOMBRES" style={{ color: '#4A9BE8' }}>{hTallas.map(t => <option key={t} value={t}>{t}</option>)}</optgroup>}
                {mTallas.length > 0 && <optgroup label="♀ MUJERES" style={{ color: '#F050A0' }}>{mTallas.map(t => <option key={t} value={t}>{t}</option>)}</optgroup>}
                {otraTallas.length > 0 && <optgroup label="OTROS">{otraTallas.map(t => <option key={t} value={t}>{t}</option>)}</optgroup>}
              </select>
            </div>
            <div className="player-edit-field player-edit-field--sm">
              <label>T. PANTALONETA</label>
              <select className="input-player" name="TALLA_PANT" defaultValue={player.TALLA_PANT}>
                <option value="">— sin pantaloneta —</option>
                {hTallas.length > 0 && <optgroup label="♂ HOMBRES" style={{ color: '#4A9BE8' }}>{hTallas.map(t => <option key={t} value={t}>{t}</option>)}</optgroup>}
                {mTallas.length > 0 && <optgroup label="♀ MUJERES" style={{ color: '#F050A0' }}>{mTallas.map(t => <option key={t} value={t}>{t}</option>)}</optgroup>}
                {otraTallas.length > 0 && <optgroup label="OTROS">{otraTallas.map(t => <option key={t} value={t}>{t}</option>)}</optgroup>}
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
