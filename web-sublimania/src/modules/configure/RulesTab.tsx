// ============================================================
//  modules/configure/RulesTab.tsx — Tab de reglas por talla
// ============================================================
import { useState, useEffect } from 'react';
import { useTeamStore } from '../../store/useTeamStore';
import { SCHEMA, TALLAS_ESTANDAR, sortTallas, getGeneroTalla } from '../../utils/schema';
import { ElementCard } from './ElementCard';
import { PiezaTabs } from './PiezaTabs';
import type { PiezaKey } from '../../types';

interface Props {
  onToast: (msg: string, type: 'ok' | 'error') => void;
}

interface TallaBtnProps {
  t: string;
  genero: 'H' | 'M' | 'O';
  playerCount: number;
  active: boolean;
  onClick: (t: string) => void;
}
function TallaBtn({ t, genero, playerCount, active, onClick }: TallaBtnProps) {
  return (
    <button
      className={`talla-btn ${active ? 'active' : ''} ${playerCount > 0 ? 'has-players' : 'no-players'} ${genero === 'M' ? 'genero-mujer' : ''}`}
      onClick={() => onClick(t)}
    >
      <span className="talla-code">{t}</span>
      <span className="talla-count">{playerCount > 0 ? `${playerCount} jug.` : '—'}</span>
    </button>
  );
}

interface CopyItemProps {
  t: string;
  genero: 'H' | 'M' | 'O';
  playerCount: number;
  checked: boolean;
  onToggle: (t: string) => void;
}
function CopyItem({ t, genero, playerCount, checked, onToggle }: CopyItemProps) {
  const g = genero.toLowerCase();
  return (
    <label className={`copy-check-item copy-check-item--${g} ${checked ? 'checked' : ''}`}>
      <input type="checkbox" checked={checked} onChange={() => onToggle(t)} />
      <span className={`copy-talla-dot copy-talla-dot--${g}`} />
      <span className="copy-talla-code">{t}</span>
      {playerCount > 0 && <span className="copy-talla-count">{playerCount}j</span>}
    </label>
  );
}

export function RulesTab({ onToast }: Props) {
  const {
    tallas, players, tallaRules,
    activeTalla, activePieza,
    setActiveTalla, setActivePieza,
    setTallaRule, applyTallaToAll, copyTallaRules,
  } = useTeamStore();

  const [copyToSet, setCopyToSet] = useState<Set<string>>(new Set());

  const rules = activeTalla ? (tallaRules[activeTalla] ?? {}) : {};
  const schema = SCHEMA[activePieza];

  // Tallas con jugadores primero (en el orden del Excel), luego las estándar sin jugadores
  const tallasExtras = tallas.filter(t => !TALLAS_ESTANDAR.includes(t));
  const tallasConJugadores = [...tallas, ...tallasExtras.filter(t => !tallas.includes(t))];
  const tallasSinJugadores = [...TALLAS_ESTANDAR, ...tallasExtras].filter(t => !tallasConJugadores.includes(t));
  const todasLasTallas = [...tallasConJugadores, ...tallasSinJugadores];

  const hombres = todasLasTallas.filter(t => t.toUpperCase().endsWith('H'));
  const mujeres = todasLasTallas.filter(t => t.toUpperCase().endsWith('M'));
  const otros   = todasLasTallas.filter(t => !t.toUpperCase().endsWith('H') && !t.toUpperCase().endsWith('M'));

  // Resetear selección al cambiar de talla activa
  useEffect(() => { setCopyToSet(new Set()); }, [activeTalla]);


  // Opciones de copia: todas las tallas excepto la activa, ordenadas y agrupadas
  const copyOptions = sortTallas(todasLasTallas.filter(t => t !== activeTalla));
  const copyH = copyOptions.filter(t => getGeneroTalla(t) === 'H');
  const copyM = copyOptions.filter(t => getGeneroTalla(t) === 'M');
  const copyO = copyOptions.filter(t => getGeneroTalla(t) === 'other');

  const allSelected = copyOptions.length > 0 && copyOptions.every(t => copyToSet.has(t));

  function toggleCopyTo(t: string) {
    setCopyToSet(prev => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t); else next.add(t);
      return next;
    });
  }

  function toggleAll() {
    setCopyToSet(allSelected ? new Set() : new Set(copyOptions));
  }


  function handleCopy() {
    if (!activeTalla || copyToSet.size === 0) return;
    copyToSet.forEach(t => copyTallaRules(activeTalla, t));
    onToast(`Reglas de ${activeTalla} copiadas a ${copyToSet.size} talla(s)`, 'ok');
    setCopyToSet(new Set());
  }


  return (
    <div className="rules-layout">
      <div className="tallas-sidebar">
        <div className="sidebar-label">TALLAS</div>

        <div className="tallas-list">
          {hombres.length > 0 && (
            <>
              <div className="sidebar-genero-label">HOMBRES</div>
              {hombres.map(t => <TallaBtn key={t} t={t} genero="H" playerCount={players.filter(p => p.TALLA === t).length} active={activeTalla === t} onClick={setActiveTalla} />)}
            </>
          )}
          {mujeres.length > 0 && (
            <>
              <div className="sidebar-genero-label genero-mujer-label">MUJERES</div>
              {mujeres.map(t => <TallaBtn key={t} t={t} genero="M" playerCount={players.filter(p => p.TALLA === t).length} active={activeTalla === t} onClick={setActiveTalla} />)}
            </>
          )}
          {otros.length > 0 && (
            <>
              <div className="sidebar-genero-label">OTROS</div>
              {otros.map(t => <TallaBtn key={t} t={t} genero="O" playerCount={players.filter(p => p.TALLA === t).length} active={activeTalla === t} onClick={setActiveTalla} />)}
            </>
          )}
        </div>

        <div className="sidebar-actions">
          <button
            className="btn btn-ghost btn-sm btn-full"
            title="Elimina overrides individuales de esta talla"
            onClick={() => { if (activeTalla) { applyTallaToAll(activeTalla); onToast(`Reglas de ${activeTalla} aplicadas a todos`, 'ok'); } }}
          >
            ↺ RESET OVERRIDES
          </button>
          <div className="copy-section">
            <div className="copy-label">
              Copiar a:
              {copyOptions.length > 0 && (
                <button className="copy-toggle-all" onClick={toggleAll}>
                  {allSelected ? 'ninguna' : 'todas'}
                </button>
              )}
            </div>
            <div className="copy-checklist">
              {copyOptions.length === 0 ? (
                <span className="copy-no-options">Sin otras tallas disponibles</span>
              ) : (
                <>
                  {copyH.length > 0 && (
                    <div className="copy-group">
                      <div className="copy-group-header copy-group-header--h">♂ HOMBRES</div>
                      {copyH.map(t => <CopyItem key={t} t={t} genero="H" playerCount={players.filter(p => p.TALLA === t).length} checked={copyToSet.has(t)} onToggle={toggleCopyTo} />)}
                    </div>
                  )}
                  {copyM.length > 0 && (
                    <div className="copy-group">
                      <div className="copy-group-header copy-group-header--m">♀ MUJERES</div>
                      {copyM.map(t => <CopyItem key={t} t={t} genero="M" playerCount={players.filter(p => p.TALLA === t).length} checked={copyToSet.has(t)} onToggle={toggleCopyTo} />)}
                    </div>
                  )}
                  {copyO.length > 0 && (
                    <div className="copy-group">
                      <div className="copy-group-header">OTROS</div>
                      {copyO.map(t => <CopyItem key={t} t={t} genero="O" playerCount={players.filter(p => p.TALLA === t).length} checked={copyToSet.has(t)} onToggle={toggleCopyTo} />)}
                    </div>
                  )}
                </>
              )}
            </div>
            <button
              className="btn btn-ghost btn-sm btn-full"
              disabled={copyToSet.size === 0}
              onClick={handleCopy}
            >
              {copyToSet.size > 0 ? `COPIAR A ${copyToSet.size} TALLA(S)` : 'COPIAR REGLAS'}
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
