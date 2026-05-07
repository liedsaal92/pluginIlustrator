// ============================================================
//  modules/configure/RulesTab.tsx — Tab de reglas por talla
// ============================================================
import { useState, useEffect, useCallback, useRef, type CSSProperties } from 'react';
import { useTeamStore } from '../../store/useTeamStore';
import { SCHEMA, ELEMENT_GROUPS, TALLAS_ESTANDAR, sortTallas, getGeneroTalla } from '../../utils/schema';
import { ElementCard } from './ElementCard';
import { PiezaTabs } from './PiezaTabs';
import { PiezaPreviewPanel } from './PiezaPreviewPanel';
import { PiezaPreviewModal } from './PiezaPreviewModal';
import type { PiezaKey, SchemaElement } from '../../types';

const CAMISETA_PIEZAS: PiezaKey[] = ['frente', 'espalda', 'manga_izq', 'manga_der'];

interface Props {
  onToast: (msg: string, type: 'ok' | 'error') => void;
  piezas?: PiezaKey[];
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
export function RulesTab({ onToast, piezas: piezasProp }: Props) {
  const activePiezas = piezasProp ?? CAMISETA_PIEZAS;
  const isPantMode = activePiezas.some(p => p === 'pant_izq' || p === 'pant_der');

  const {
    tallas, players, tallaRules,
    activeTalla, activeTallaPant, activePieza,
    setActiveTalla, setActiveTallaPant, setActivePieza,
    setTallaRule, applyTallaToAll, copyTallaRules,
  } = useTeamStore();

  const currentTalla = isPantMode ? activeTallaPant : activeTalla;
  const setCurrentTalla = isPantMode ? setActiveTallaPant : setActiveTalla;

  const [showPreviewPanel, setShowPreviewPanel] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [copyToSet, setCopyToSet] = useState<Set<string>>(new Set());
  // expandedGroups: key = "pieza:group", value = boolean
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  // Accordion state for tallas sidebar and copy section
  const [tallaAccordion, setTallaAccordion] = useState<Record<string, boolean>>({ H: true, M: true, O: true });
  const [copyAccordion, setCopyAccordion] = useState<Record<string, boolean>>({ H: true, M: true, O: true });
  // Undo stack: {talla, key, prevVal}
  const [undoStack, setUndoStack] = useState<Array<{ talla: string; key: string; prevVal: string }>>([]);
  const [undoFlash, setUndoFlash] = useState(false);
  const undoFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rules = currentTalla ? (tallaRules[currentTalla] ?? {}) : {};
  const playerCount = (t: string) => isPantMode
    ? players.filter(p => p.TALLA_PANT === t).length
    : players.filter(p => p.TALLA_CAMI === t).length;

  // Auto-switch to first valid pieza when entering a tab whose piezas don't include the current one
  useEffect(() => {
    if (!activePiezas.includes(activePieza)) {
      setActivePieza(activePiezas[0]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePiezas.join(',')]);

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

  function handleRuleChange(talla: string, key: string, val: string) {
    const prevVal = (tallaRules[talla] ?? {})[key] ?? '';
    setUndoStack(prev => [...prev.slice(-49), { talla, key, prevVal }]);
    setTallaRule(talla, key, val);
  }

  const handleUndo = useCallback(() => {
    setUndoStack(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setTallaRule(last.talla, last.key, last.prevVal);
      if (undoFlashTimer.current) clearTimeout(undoFlashTimer.current);
      setUndoFlash(true);
      undoFlashTimer.current = setTimeout(() => setUndoFlash(false), 600);
      return prev.slice(0, -1);
    });
  }, [setTallaRule]);

  // Ctrl+Z keyboard shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleUndo]);

  // Clear undo stack when talla changes
  useEffect(() => { setUndoStack([]); }, [currentTalla]);

  // Talla lists
  let todasLasTallas: string[];
  if (isPantMode) {
    const pantTallasJugadores = [...new Set(players.map(p => p.TALLA_PANT).filter(Boolean))];
    const pantExtras = pantTallasJugadores.filter(t => !TALLAS_ESTANDAR.includes(t));
    todasLasTallas = sortTallas([...new Set([...pantTallasJugadores, ...TALLAS_ESTANDAR, ...pantExtras])]);
  } else {
    const tallasExtras = tallas.filter(t => !TALLAS_ESTANDAR.includes(t));
    const tallasConJugadores = [...tallas, ...tallasExtras.filter(t => !tallas.includes(t))];
    const tallasSinJugadores = [...TALLAS_ESTANDAR, ...tallasExtras].filter(t => !tallasConJugadores.includes(t));
    todasLasTallas = [...tallasConJugadores, ...tallasSinJugadores];
  }

  const hombres = todasLasTallas.filter(t => t.toUpperCase().endsWith('H'));
  const mujeres = todasLasTallas.filter(t => t.toUpperCase().endsWith('M'));
  const otros   = todasLasTallas.filter(t => !t.toUpperCase().endsWith('H') && !t.toUpperCase().endsWith('M'));

  useEffect(() => { setCopyToSet(new Set()); }, [currentTalla]);

  // Auto-expand the talla group containing the active talla
  useEffect(() => {
    if (!currentTalla) return;
    const g = currentTalla.toUpperCase().endsWith('H') ? 'H' : currentTalla.toUpperCase().endsWith('M') ? 'M' : 'O';
    setTallaAccordion(prev => prev[g] ? prev : { ...prev, [g]: true });
  }, [currentTalla]);

  const copyOptions = sortTallas(todasLasTallas.filter(t => t !== currentTalla));
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
    if (!currentTalla || copyToSet.size === 0) return;
    copyToSet.forEach(t => copyTallaRules(currentTalla, t));
    onToast(`Reglas de ${currentTalla} copiadas a ${copyToSet.size} talla(s)`, 'ok');
    setCopyToSet(new Set());
  }

  return (
    <div className={`rules-layout${showPreviewPanel && currentTalla ? ' with-preview' : ''}`}>
      {/* ── Sidebar tallas ── */}
      <div className="tallas-sidebar">
        <div className="sidebar-label">TALLAS</div>

        <div className="tallas-list">
          {hombres.length > 0 && (
            <>
              <button
                className={`sidebar-genero-accordion ${tallaAccordion.H ? 'open' : ''}`}
                onClick={() => setTallaAccordion(p => ({ ...p, H: !p.H }))}
              >
                <span>HOMBRES</span>
                <span className="sidebar-accordion-meta">
                  {hombres.length} · {tallaAccordion.H ? '▾' : '▸'}
                </span>
              </button>
              {tallaAccordion.H && hombres.map(t => <TallaBtn key={t} t={t} genero="H" playerCount={playerCount(t)} active={currentTalla === t} onClick={setCurrentTalla} />)}
            </>
          )}
          {mujeres.length > 0 && (
            <>
              <button
                className={`sidebar-genero-accordion genero-mujer-label ${tallaAccordion.M ? 'open' : ''}`}
                onClick={() => setTallaAccordion(p => ({ ...p, M: !p.M }))}
              >
                <span>MUJERES</span>
                <span className="sidebar-accordion-meta">
                  {mujeres.length} · {tallaAccordion.M ? '▾' : '▸'}
                </span>
              </button>
              {tallaAccordion.M && mujeres.map(t => <TallaBtn key={t} t={t} genero="M" playerCount={playerCount(t)} active={currentTalla === t} onClick={setCurrentTalla} />)}
            </>
          )}
          {otros.length > 0 && (
            <>
              <button
                className={`sidebar-genero-accordion ${tallaAccordion.O ? 'open' : ''}`}
                onClick={() => setTallaAccordion(p => ({ ...p, O: !p.O }))}
              >
                <span>OTROS</span>
                <span className="sidebar-accordion-meta">
                  {otros.length} · {tallaAccordion.O ? '▾' : '▸'}
                </span>
              </button>
              {tallaAccordion.O && otros.map(t => <TallaBtn key={t} t={t} genero="O" playerCount={playerCount(t)} active={currentTalla === t} onClick={setCurrentTalla} />)}
            </>
          )}
        </div>

        <div className="sidebar-actions">
          <div className="sidebar-undo-row">
            <button
              className={`btn btn-ghost btn-sm btn-full ${undoFlash ? 'undo-flash' : ''}`}
              title="Deshacer último cambio (Ctrl+Z)"
              disabled={undoStack.length === 0}
              onClick={handleUndo}
            >
              ↩ DESHACER {undoStack.length > 0 ? `(${undoStack.length})` : ''}
            </button>
          </div>
          {!isPantMode && (
            <button
              className="btn btn-ghost btn-sm btn-full"
              title="Elimina overrides individuales de esta talla"
              onClick={() => { if (currentTalla) { applyTallaToAll(currentTalla); onToast(`Reglas de ${currentTalla} aplicadas a todos`, 'ok'); } }}
            >
              ↺ RESET OVERRIDES
            </button>
          )}
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
                      <button
                        className={`copy-group-header copy-group-header--h copy-group-accordion ${copyAccordion.H ? 'open' : ''}`}
                        onClick={() => setCopyAccordion(p => ({ ...p, H: !p.H }))}
                      >
                        <span>♂ HOMBRES</span>
                        <span>{copyH.filter(t => copyToSet.has(t)).length}/{copyH.length} {copyAccordion.H ? '▾' : '▸'}</span>
                      </button>
                      {copyAccordion.H && copyH.map(t => <CopyItem key={t} t={t} genero="H" playerCount={playerCount(t)} checked={copyToSet.has(t)} onToggle={toggleCopyTo} />)}
                    </div>
                  )}
                  {copyM.length > 0 && (
                    <div className="copy-group">
                      <button
                        className={`copy-group-header copy-group-header--m copy-group-accordion ${copyAccordion.M ? 'open' : ''}`}
                        onClick={() => setCopyAccordion(p => ({ ...p, M: !p.M }))}
                      >
                        <span>♀ MUJERES</span>
                        <span>{copyM.filter(t => copyToSet.has(t)).length}/{copyM.length} {copyAccordion.M ? '▾' : '▸'}</span>
                      </button>
                      {copyAccordion.M && copyM.map(t => <CopyItem key={t} t={t} genero="M" playerCount={playerCount(t)} checked={copyToSet.has(t)} onToggle={toggleCopyTo} />)}
                    </div>
                  )}
                  {copyO.length > 0 && (
                    <div className="copy-group">
                      <button
                        className={`copy-group-header copy-group-accordion ${copyAccordion.O ? 'open' : ''}`}
                        onClick={() => setCopyAccordion(p => ({ ...p, O: !p.O }))}
                      >
                        <span>OTROS</span>
                        <span>{copyO.filter(t => copyToSet.has(t)).length}/{copyO.length} {copyAccordion.O ? '▾' : '▸'}</span>
                      </button>
                      {copyAccordion.O && copyO.map(t => <CopyItem key={t} t={t} genero="O" playerCount={playerCount(t)} checked={copyToSet.has(t)} onToggle={toggleCopyTo} />)}
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
        <div className="rules-main-topbar">
          <PiezaTabs active={activePieza} onChange={p => setActivePieza(p as PiezaKey)} piezas={activePiezas} />
          {currentTalla && (
            <button
              className={`rules-preview-trigger${showPreviewPanel ? ' active' : ''}`}
              title={`${showPreviewPanel ? 'Cerrar' : 'Abrir'} preview de ${SCHEMA[activePieza]?.label} — ${currentTalla}`}
              onClick={() => setShowPreviewPanel(v => !v)}
            >
              <svg viewBox="0 0 20 20" fill="none" width="16" height="16" aria-hidden="true">
                <circle cx="8.5" cy="8.5" r="5" stroke="currentColor" strokeWidth="2"/>
                <line x1="12.5" y1="12.5" x2="17" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <line x1="6.5" y1="8.5" x2="10.5" y2="8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="8.5" y1="6.5" x2="8.5" y2="10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              PREVIEW
            </button>
          )}
        </div>

        {!currentTalla ? (
          <div className="rules-empty-state">
            <span className="rules-empty-icon">←</span>
            <p>Seleccioná una talla para configurar sus reglas</p>
          </div>
        ) : (
          <>
            {/* Onboarding hint — solo visible si nada está activo en esta pieza/talla */}
            {schema && !schema.elements.some(el => el.toggleKey && rules[el.toggleKey] === 'SI') && !searchQuery && (
              <div className="rules-onboarding-hint">
                <div className="rules-onboarding-icon">
                  <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/>
                    <line x1="12" y1="8" x2="12" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <circle cx="12" cy="16.5" r="1" fill="currentColor"/>
                  </svg>
                </div>
                <div className="rules-onboarding-body">
                  <div className="rules-onboarding-title">TALLA SIN CONFIGURAR</div>
                  <div className="rules-onboarding-text">
                    Activá elementos con el toggle <span className="rules-onboarding-badge">SI</span> y completá sus medidas. El preview se actualiza en tiempo real.
                  </div>
                </div>
              </div>
            )}

            <div className="rules-search-bar">
              <input
                className="rules-search-input"
                type="search"
                placeholder="Buscar elemento… (NOMBRE, LOGO, PATRON…)"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="rules-search-clear" onClick={() => setSearchQuery('')}>×</button>
              )}
            </div>
            <div className="element-groups-stack">
              {(() => {
                const q = searchQuery.toLowerCase().trim();
                const visibleGroups = groupedElements
                  .map(({ groupKey, elements }) => ({
                    groupKey,
                    elements: q ? elements.filter(el => el.label.toLowerCase().includes(q) || el.id.toLowerCase().includes(q)) : elements,
                  }))
                  .filter(({ elements }) => elements.length > 0);

                if (visibleGroups.length === 0) {
                  return <div className="rules-search-empty">Sin resultados para "{searchQuery}"</div>;
                }
                return visibleGroups.map(({ groupKey, elements }) => (
                  <ElementGroup
                    key={groupKey}
                    groupKey={groupKey}
                    elements={elements}
                    rules={rules}
                    piezaColor={schema?.color ?? '#999'}
                    expanded={q ? true : isGroupExpanded(groupKey)}
                    onToggle={() => toggleGroup(groupKey)}
                    activeTalla={currentTalla ?? ''}
                    onChange={(key, val) => handleRuleChange(currentTalla ?? '', key, val)}
                  />
                ));
              })()}
            </div>
          </>
        )}
      </div>

      {/* ── Preview panel (3rd column) ── */}
      {showPreviewPanel && currentTalla && (
        <PiezaPreviewPanel
          pieza={activePieza}
          talla={currentTalla}
          rules={rules}
          onClose={() => setShowPreviewPanel(false)}
          onExpand={() => setPreviewOpen(true)}
        />
      )}

      {/* ── Preview modal (fullscreen) ── */}
      {previewOpen && currentTalla && (
        <PiezaPreviewModal
          pieza={activePieza}
          talla={currentTalla}
          rules={rules}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </div>
  );
}
