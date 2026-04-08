// ============================================================
//  modules/configure/RulesTab.tsx — Tab de reglas por talla
// ============================================================
import { useState, useEffect } from 'react';
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

  // Opciones de copia: mismo género que la talla activa, excluyendo la activa
  const generoActivo = activeTalla
    ? activeTalla.toUpperCase().endsWith('H') ? 'H'
    : activeTalla.toUpperCase().endsWith('M') ? 'M'
    : 'O'
    : null;

  const copyOptions = todasLasTallas.filter(t => {
    if (t === activeTalla) return false;
    if (generoActivo === 'H') return t.toUpperCase().endsWith('H');
    if (generoActivo === 'M') return t.toUpperCase().endsWith('M');
    return !t.toUpperCase().endsWith('H') && !t.toUpperCase().endsWith('M');
  });

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

  function TallaBtn({ t, genero }: { t: string; genero: 'H' | 'M' | 'O' }) {
    const count = players.filter(p => p.TALLA === t).length;
    return (
      <button
        key={t}
        className={`talla-btn ${activeTalla === t ? 'active' : ''} ${count > 0 ? 'has-players' : 'no-players'} ${genero === 'M' ? 'genero-mujer' : ''}`}
        onClick={() => setActiveTalla(t)}
      >
        <span className="talla-code">{t}</span>
        <span className="talla-count">{count > 0 ? `${count} jug.` : '—'}</span>
      </button>
    );
  }

  return (
    <div className="rules-layout">
      <div className="tallas-sidebar">
        <div className="sidebar-label">TALLAS</div>

        {hombres.length > 0 && (
          <>
            <div className="sidebar-genero-label">HOMBRES</div>
            {hombres.map(t => <TallaBtn key={t} t={t} genero="H" />)}
          </>
        )}
        {mujeres.length > 0 && (
          <>
            <div className="sidebar-genero-label genero-mujer-label">MUJERES</div>
            {mujeres.map(t => <TallaBtn key={t} t={t} genero="M" />)}
          </>
        )}
        {otros.length > 0 && (
          <>
            <div className="sidebar-genero-label">OTROS</div>
            {otros.map(t => <TallaBtn key={t} t={t} genero="O" />)}
          </>
        )}

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
            <div className={`copy-checklist ${generoActivo === 'M' ? 'genero-mujer' : ''}`}>
              {copyOptions.length === 0 ? (
                <span className="copy-no-options">Sin otras tallas del mismo género</span>
              ) : copyOptions.map(t => (
                <label key={t} className={`copy-check-item ${copyToSet.has(t) ? 'checked' : ''}`}>
                  <input type="checkbox" checked={copyToSet.has(t)} onChange={() => toggleCopyTo(t)} />
                  <span>{t}</span>
                </label>
              ))}
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
