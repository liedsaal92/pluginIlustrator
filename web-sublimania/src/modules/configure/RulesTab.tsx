// ============================================================
//  modules/configure/RulesTab.tsx — Tab de reglas por talla
// ============================================================
import { useState } from 'react';
import { useTeamStore } from '../../store/useTeamStore';
import { SCHEMA, TALLAS_ESTANDAR } from '../../utils/schema';
import { ElementCard } from './ElementCard';
import { PiezaTabs } from './PiezaTabs';
import type { PiezaKey } from '../../types';

interface Props {
  onToast: (msg: string, type: 'ok' | 'error') => void;
}

export function RulesTab({ onToast }: Props) {
  const {
    tallas, players, tallaRules,
    activeTalla, activePieza,
    setActiveTalla, setActivePieza,
    setTallaRule, applyTallaToAll, copyTallaRules, copyTallaRulesToAll,
  } = useTeamStore();

  const [copyTo, setCopyTo] = useState('');

  const rules = activeTalla ? (tallaRules[activeTalla] ?? {}) : {};
  const schema = SCHEMA[activePieza];

  // Tallas con jugadores primero (en el orden del Excel), luego las estándar sin jugadores
  const tallasExtras = tallas.filter(t => !TALLAS_ESTANDAR.includes(t));
  const tallasConJugadores = [...tallas, ...tallasExtras.filter(t => !tallas.includes(t))];
  const tallasSinJugadores = [...TALLAS_ESTANDAR, ...tallasExtras].filter(t => !tallasConJugadores.includes(t));
  const todasLasTallas = [...tallasConJugadores, ...tallasSinJugadores];

  return (
    <div className="rules-layout">
      <div className="tallas-sidebar">
        <div className="sidebar-label">TALLAS</div>
        {todasLasTallas.map(t => {
          const count = players.filter(p => p.TALLA === t).length;
          return (
            <button
              key={t}
              className={`talla-btn ${activeTalla === t ? 'active' : ''} ${count > 0 ? 'has-players' : 'no-players'}`}
              onClick={() => setActiveTalla(t)}
            >
              <span className="talla-code">{t}</span>
              <span className="talla-count">{count > 0 ? `${count} jug.` : '—'}</span>
            </button>
          );
        })}

        <div className="sidebar-actions">
          <button
            className="btn btn-ghost btn-sm btn-full"
            title="Elimina overrides individuales de esta talla"
            onClick={() => { if (activeTalla) { applyTallaToAll(activeTalla); onToast(`Reglas de ${activeTalla} aplicadas a todos`, 'ok'); } }}
          >
            ↺ RESET OVERRIDES
          </button>
          <div className="copy-section">
            <div className="copy-label">Copiar a:</div>
            <select className="select-copy" value={copyTo} onChange={e => setCopyTo(e.target.value)}>
              <option value="">— talla —</option>
              {todasLasTallas.filter(t => t !== activeTalla).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <button
              className="btn btn-ghost btn-sm btn-full"
              onClick={() => { if (activeTalla && copyTo) { copyTallaRules(activeTalla, copyTo); onToast(`Reglas de ${activeTalla} copiadas a ${copyTo}`, 'ok'); } }}
            >
              COPIAR REGLAS
            </button>
            <button
              className="btn btn-ghost btn-sm btn-full btn-copy-all"
              title="Copia estas reglas a todas las demás tallas"
              onClick={() => {
                if (tallas.length < 2) { onToast('Solo hay una talla', 'error'); return; }
                if (activeTalla) { copyTallaRulesToAll(activeTalla); onToast(`Reglas de ${activeTalla} copiadas a todas`, 'ok'); }
              }}
            >
              COPIAR A TODAS
            </button>
          </div>
        </div>
      </div>

      <div className="rules-main">
        <PiezaTabs active={activePieza} onChange={p => setActivePieza(p as PiezaKey)} />
        <div className="elements-grid">
          {activeTalla && schema?.elements.map(el => (
            <ElementCard
              key={el.id}
              el={el}
              rules={rules}
              mode="talla"
              isOverridden={() => false}
              onChange={(key, val) => setTallaRule(activeTalla, key, val)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
