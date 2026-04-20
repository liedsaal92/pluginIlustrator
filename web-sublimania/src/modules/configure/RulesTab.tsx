// ============================================================
//  modules/configure/RulesTab.tsx — Tab de reglas por talla
// ============================================================
import { useState, useEffect, type CSSProperties } from 'react';
import { useTeamStore } from '../../store/useTeamStore';
import { SCHEMA, ELEMENT_GROUPS, TALLAS_ESTANDAR, sortTallas, getGeneroTalla } from '../../utils/schema';
import { ElementCard } from './ElementCard';
import { PiezaTabs } from './PiezaTabs';
import type { PiezaKey, SchemaElement } from '../../types';

interface Props {
  onToast: (msg: string, type: 'ok' | 'error') => void;
}

// ── Talla sidebar buttons ─────────────────────────────────────
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

// ── Copy-to checkboxes ────────────────────────────────────────
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

// ── Element group accordion ───────────────────────────────────
interface ElementGroupProps {
  groupKey: string;
  elements: SchemaElement[];
  rules: Record<string, string>;
  piezaColor: string;
  expanded: boolean;
  onToggle: () => void;
  activeTalla: string;
  onChange: (key: string, val: string) => void;
}
function ElementGroup({ groupKey, elements, rules, piezaColor, expanded, onToggle, onChange }: ElementGroupProps) {
  const meta = ELEMENT_GROUPS[groupKey] ?? { label: groupKey.toUpperCase(), icon: '•' };

  // Count active elements for badge
  const activeCount = elements.filter(el => !el.toggleKey || rules[el.toggleKey] === 'SI').length;

  return (
    <div className="element-group">
      <button
        className={`element-group-header ${expanded ? 'expanded' : ''}`}
        style={{ '--pieza-color': piezaColor } as CSSProperties}
        onClick={onToggle}
        type="button"
      >
        <span className="element-group-icon">{meta.icon}</span>
        <span className="element-group-label">{meta.label}</span>
        <span className="element-group-count">
          {activeCount}/{elements.length}
        </span>
        <span className="element-group-chevron">{expanded ? '▾' : '▸'}</span>
      </button>
      {expanded && (
        <div className="element-group-body">
          <div className="elements-grid" style={{ '--pieza-color': piezaColor } as CSSProperties}>
            {elements.map(el => (
              <ElementCard
                key={el.id}
                el={el}
                rules={rules}
                mode="talla"
                isOverridden={() => false}
                onChange={onChange}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────
export function RulesTab({ onToast }: Props) {
  const {
    tallas, players, tallaRules,
    activeTalla, activePieza,
    setActiveTalla, setActivePieza,
    setTallaRule, applyTallaToAll, copyTallaRules,
  } = useTeamStore();

  const [copyToSet, setCopyToSet] = useState<Set<string>>(new Set());
  // expandedGroups: key = "pieza:group", value = boolean
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const rules = activeTalla ? (tallaRules[activeTalla] ?? {}) : {};
  const schema = SCHEMA[activePieza];

  // Group elements by their group key, preserving order of first occurrence
  const groupedElements: { groupKey: string; elements: SchemaElement[] }[] = [];
  if (schema) {
    const seen = new Map<string, SchemaElement[]>();
    schema.elements.forEach(el => {
      const gk = el.group ?? 'general';
      if (!seen.has(gk)) seen.set(gk, []);
      seen.get(gk)!.push(el);
    });
    seen.forEach((els, gk) => groupedElements.push({ groupKey: gk, elements: els }));
  }

  // Default all groups to expanded when pieza or talla changes
  useEffect(() => {
    const defaults: Record<string, boolean> = {};
    groupedElements.forEach(({ groupKey }) => {
      const stateKey = `${activePieza}:${groupKey}`;
      if (!(stateKey in expandedGroups)) defaults[stateKey] = true;
    });
    if (Object.keys(defaults).length > 0) {
      setExpandedGroups(prev => ({ ...defaults, ...prev }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePieza]);

  function toggleGroup(groupKey: string) {
    const stateKey = `${activePieza}:${groupKey}`;
    setExpandedGroups(prev => ({ ...prev, [stateKey]: !prev[stateKey] }));
  }

  function isGroupExpanded(groupKey: string): boolean {
    const stateKey = `${activePieza}:${groupKey}`;
    return expandedGroups[stateKey] !== false; // default true
  }

  // Talla lists
  const tallasExtras = tallas.filter(t => !TALLAS_ESTANDAR.includes(t));
  const tallasConJugadores = [...tallas, ...tallasExtras.filter(t => !tallas.includes(t))];
  const tallasSinJugadores = [...TALLAS_ESTANDAR, ...tallasExtras].filter(t => !tallasConJugadores.includes(t));
  const todasLasTallas = [...tallasConJugadores, ...tallasSinJugadores];

  const hombres = todasLasTallas.filter(t => t.toUpperCase().endsWith('H'));
  const mujeres = todasLasTallas.filter(t => t.toUpperCase().endsWith('M'));
  const otros   = todasLasTallas.filter(t => !t.toUpperCase().endsWith('H') && !t.toUpperCase().endsWith('M'));

  useEffect(() => { setCopyToSet(new Set()); }, [activeTalla]);

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
      {/* ── Sidebar tallas ── */}
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

      {/* ── Main rules area ── */}
      <div className="rules-main">
        <PiezaTabs active={activePieza} onChange={p => setActivePieza(p as PiezaKey)} />

        {!activeTalla ? (
          <div className="rules-empty-state">
            <span className="rules-empty-icon">←</span>
            <p>Seleccioná una talla para configurar sus reglas</p>
          </div>
        ) : (
          <div className="element-groups-stack">
            {groupedElements.map(({ groupKey, elements }) => (
              <ElementGroup
                key={groupKey}
                groupKey={groupKey}
                elements={elements}
                rules={rules}
                piezaColor={schema?.color ?? '#999'}
                expanded={isGroupExpanded(groupKey)}
                onToggle={() => toggleGroup(groupKey)}
                activeTalla={activeTalla}
                onChange={(key, val) => setTallaRule(activeTalla, key, val)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
