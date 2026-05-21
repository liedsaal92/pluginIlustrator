// ============================================================
//  modules/preview/PreviewScreen.tsx
// ============================================================
import { useState, useMemo } from 'react';
import { useTeamStore } from '../../store/useTeamStore';
import { useClientesStore } from '../../store/useClientesStore';
import { useMoldesStore } from '../../store/useMoldesStore';
import { useTallasStore, TALLAS_DEFAULT } from '../../store/useTallasStore';
import { SCHEMA, ELEMENT_GROUPS } from '../../utils/schema';
import type { PiezaKey, TallaDims, Rules, SchemaElement } from '../../types';

// ── Colores por grupo ────────────────────────────────────────
const GROUP_COLORS: Record<string, string> = {
  identificacion: '#E84040',
  logos:          '#4A9BE8',
  sponsors:       '#FF6B2B',
  etiquetas:      '#9B59B6',
  decoracion:     '#27AE60',
  lineas:         '#E67E22',
};

const OVERFLOW_COLOR = '#FF3B3B';

const PIEZA_TABS: { key: PiezaKey; label: string }[] = [
  { key: 'frente',    label: 'FRENTE'    },
  { key: 'espalda',   label: 'ESPALDA'   },
  { key: 'manga_izq', label: 'MANGA IZQ' },
  { key: 'manga_der', label: 'MANGA DER' },
  { key: 'pant_izq',  label: 'PANT IZQ'  },
  { key: 'pant_der',  label: 'PANT DER'  },
];

// ── Posicionamiento ──────────────────────────────────────────
interface ElRect {
  x: number; y: number; w: number; h: number;
  marginSup?: number; marginInf?: number; marginLat?: number;
}

function getElRect(el: SchemaElement, rules: Rules, svgW: number, svgH: number): ElRect | null {
  const wKey   = el.fields.find(f => f.key.endsWith('_ANCHO'))?.key;
  const hKey   = el.fields.find(f => f.key.endsWith('_ALTO'))?.key;
  const supKey = el.fields.find(f => f.key.endsWith('_MARGIN_SUP'))?.key;
  const infKey = el.fields.find(f => f.key.endsWith('_MARGIN_INF'))?.key;
  const latKey = el.fields.find(f => f.key.endsWith('_MARGIN_LAT'))?.key;
  const ladoKey = el.fields.find(f => f.key.endsWith('_LADO'))?.key;

  const elW = parseFloat(rules[wKey ?? ''] ?? '') || 5;
  const elH = parseFloat(rules[hKey ?? ''] ?? '') || 3;
  const marginSup = supKey ? (parseFloat(rules[supKey] ?? '') || 0) : undefined;
  const marginInf = infKey ? (parseFloat(rules[infKey] ?? '') || 0) : undefined;
  const marginLat = latKey ? (parseFloat(rules[latKey] ?? '') || 0) : undefined;

  let y: number;
  if (marginSup !== undefined)      y = marginSup;
  else if (marginInf !== undefined) y = svgH - marginInf - elH;
  else                              y = (svgH - elH) / 2;

  let x: number;
  if (marginLat === undefined) {
    x = (svgW - elW) / 2;
  } else {
    const lado  = ladoKey ? (rules[ladoKey] ?? 'IZQ') : null;
    const isDer = lado === 'DER' || el.id.includes('_der') || el.id === 'logo_marca';
    x = isDer ? svgW - marginLat - elW : marginLat;
  }

  return { x, y, w: elW, h: elH, marginSup, marginInf, marginLat };
}

// ── Overflow check ────────────────────────────────────────────
interface OverflowInfo {
  left: boolean; right: boolean; top: boolean; bottom: boolean; any: boolean;
  leftCm: number; rightCm: number; topCm: number; bottomCm: number;
}

function checkOverflow(rect: ElRect, svgW: number, svgH: number): OverflowInfo {
  const leftCm   = Math.max(0, -rect.x);
  const rightCm  = Math.max(0, rect.x + rect.w - svgW);
  const topCm    = Math.max(0, -rect.y);
  const bottomCm = Math.max(0, rect.y + rect.h - svgH);
  return {
    left: leftCm > 0, right: rightCm > 0, top: topCm > 0, bottom: bottomCm > 0,
    any: leftCm > 0 || rightCm > 0 || topCm > 0 || bottomCm > 0,
    leftCm, rightCm, topCm, bottomCm,
  };
}

// ── SVG silhouette paths ─────────────────────────────────────
function bodyPath(W: number, H: number): string {
  return [
    `M ${(W * 0.12).toFixed(2)} 0`,
    `L ${(W * 0.36).toFixed(2)} 0`,
    `Q ${(W * 0.5).toFixed(2)} ${(H * 0.09).toFixed(2)} ${(W * 0.64).toFixed(2)} 0`,
    `L ${(W * 0.88).toFixed(2)} 0`,
    `L ${W.toFixed(2)} ${(H * 0.12).toFixed(2)}`,
    `L ${W.toFixed(2)} ${H.toFixed(2)}`,
    `L 0 ${H.toFixed(2)}`,
    `L 0 ${(H * 0.12).toFixed(2)}`,
    'Z',
  ].join(' ');
}

function sleevePath(W: number, H: number): string {
  const ti = W * 0.1;
  return [`M ${ti.toFixed(2)} 0`, `L ${(W - ti).toFixed(2)} 0`, `L ${W.toFixed(2)} ${H.toFixed(2)}`, `L 0 ${H.toFixed(2)}`, 'Z'].join(' ');
}

function pantallonetaPath(W: number, H: number): string {
  return [`M 0 0`, `L ${W.toFixed(2)} 0`, `L ${W.toFixed(2)} ${H.toFixed(2)}`, `L 0 ${H.toFixed(2)}`, 'Z'].join(' ');
}

// ── Component ────────────────────────────────────────────────
interface Props { onToast: (msg: string, type: 'ok' | 'error') => void; }

export function PreviewScreen({ onToast: _onToast }: Props) {
  const { players, tallas, tallaRules, getPlayerRules } = useTeamStore();
  const clientes  = useClientesStore(s => s.clientes);
  const { moldes } = useMoldesStore();
  const { getTallas } = useTallasStore();

  const [clienteId, setClienteId] = useState('');
  const [moldeId,   setMoldeId]   = useState(moldes[0]?.id ?? '');
  const [playerIdx, setPlayerIdx] = useState(0);
  const [pieza,     setPieza]     = useState<PiezaKey>('frente');
  const [hoveredEl, setHoveredEl] = useState<string | null>(null);
  const [zoom,      setZoom]      = useState(90);

  const player = players[playerIdx];
  const talla  = player?.TALLA_CAMI ?? tallas[0] ?? '';

  const tallaDimsMap = useMemo(
    () => (clienteId && moldeId) ? getTallas(clienteId, moldeId) : {},
    [clienteId, moldeId, getTallas]
  );

  const dims: TallaDims = (tallaDimsMap[talla] && (tallaDimsMap[talla].ANCHO || tallaDimsMap[talla].ALTO))
    ? tallaDimsMap[talla]
    : (TALLAS_DEFAULT[talla] ?? { ALTO: '70', ANCHO: '50', MANGA_ANCHO: '40', MANGA_ALTO: '25' });

  const usingDefault = !clienteId || !(tallaDimsMap[talla]?.ANCHO);

  const rules: Rules = player ? getPlayerRules(playerIdx) : (tallaRules[talla] ?? {});

  const isBody = pieza === 'frente' || pieza === 'espalda';
  const isPant = pieza === 'pant_izq' || pieza === 'pant_der';
  const svgW   = isBody ? (parseFloat(dims.ANCHO) || 50)
               : isPant ? (parseFloat(rules['PANT_ANCHO'] ?? '') || 40)
               : (parseFloat(dims.MANGA_ANCHO) || 40);
  const svgH   = isBody ? (parseFloat(dims.ALTO)  || 70)
               : isPant ? (parseFloat(rules['PANT_ALTO'] ?? '') || 55)
               : (parseFloat(dims.MANGA_ALTO)  || 25);
  const silPath = isBody ? bodyPath(svgW, svgH) : isPant ? pantallonetaPath(svgW, svgH) : sleevePath(svgW, svgH);

  const piezaDef  = SCHEMA[pieza];
  const activeEls = piezaDef.elements.filter(el => el.toggleKey && rules[el.toggleKey] === 'SI');
  const activeGroups = [...new Set(activeEls.map(el => el.group ?? '').filter(Boolean))];

  // ── Overflow map ─────────────────────────────────────────
  const overflowMap = useMemo(() => {
    const map: Record<string, OverflowInfo> = {};
    activeEls.forEach(el => {
      const rect = getElRect(el, rules, svgW, svgH);
      if (rect) map[el.id] = checkOverflow(rect, svgW, svgH);
    });
    return map;
  }, [activeEls, rules, svgW, svgH]);

  const overflowCount = Object.values(overflowMap).filter(v => v.any).length;

  const strokeW   = svgW * 0.006;
  const fontSize  = Math.max(svgW * 0.028, 1);
  const fontSizeSm = Math.max(svgW * 0.022, 0.8);

  return (
    <div className="screen preview-screen">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="preview-header">
        <div className="preview-title-main">PREVIEW</div>
        {player
          ? <div className="preview-title-sub">// {player.NOMBRE_CAMISETA || player.NOMBRE} · {talla}</div>
          : talla ? <div className="preview-title-sub">// TALLA {talla}</div> : null
        }
        {overflowCount > 0 && (
          <div className="preview-header-overflow">
            ⚠ {overflowCount} elemento{overflowCount > 1 ? 's' : ''} fuera de silueta
          </div>
        )}
      </div>

      <div className="preview-body">

        {/* ── LEFT: controls ─────────────────────────────────── */}
        <div className="preview-controls">

          <div className="preview-section">
            <div className="preview-section-label">CLIENTE / COSTURERA</div>
            {clientes.length === 0 ? (
              <div className="preview-hint">Sin clientes — se usan tallas estándar</div>
            ) : (
              <select className="preview-select" value={clienteId} onChange={e => setClienteId(e.target.value)}>
                <option value="">— Tallas estándar —</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}{c.casaCosturera ? ` — ${c.casaCosturera}` : ''}</option>
                ))}
              </select>
            )}
          </div>

          <div className="preview-section">
            <div className="preview-section-label">TIPO DE MOLDE</div>
            <select className="preview-select" value={moldeId} onChange={e => setMoldeId(e.target.value)}>
              <option value="">— Seleccionar —</option>
              {moldes.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
          </div>

          <div className="preview-section">
            <div className="preview-section-label">JUGADOR</div>
            {players.length === 0 ? (
              <div className="preview-hint">Sin jugadores — mostrando reglas de talla</div>
            ) : (
              <select className="preview-select" value={playerIdx} onChange={e => setPlayerIdx(Number(e.target.value))}>
                {players.map((p, i) => (
                  <option key={i} value={i}>{p.NOMBRE_CAMISETA || p.NOMBRE} — {p.TALLA_CAMI}</option>
                ))}
              </select>
            )}
            {players.length === 0 && tallas.length > 0 && (
              <select className="preview-select" value={talla} onChange={() => {}}>
                {tallas.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            )}
          </div>

          <div className="preview-section">
            <div className="preview-section-label">PIEZA</div>
            <div className="preview-pieza-tabs">
              {PIEZA_TABS.map(t => (
                <button key={t.key} className={`preview-pieza-tab ${pieza === t.key ? 'active' : ''}`} onClick={() => setPieza(t.key)}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="preview-section">
            <div className="preview-section-label">
              DIMENSIONES · {talla}
              {usingDefault && <span className="preview-dim-badge">ESTÁNDAR</span>}
            </div>
            <div className="preview-dims">
              {isPant ? (
                <>
                  <div className="preview-dim-row"><span>PANT ANCHO</span><strong>{rules['PANT_ANCHO'] || '—'} cm</strong></div>
                  <div className="preview-dim-row"><span>PANT ALTO</span><strong>{rules['PANT_ALTO'] || '—'} cm</strong></div>
                </>
              ) : isBody ? (
                <>
                  <div className="preview-dim-row"><span>ANCHO</span><strong>{dims.ANCHO} cm</strong></div>
                  <div className="preview-dim-row"><span>ALTO</span><strong>{dims.ALTO} cm</strong></div>
                </>
              ) : (
                <>
                  <div className="preview-dim-row"><span>MANGA ANCHO</span><strong>{dims.MANGA_ANCHO} cm</strong></div>
                  <div className="preview-dim-row"><span>MANGA ALTO</span><strong>{dims.MANGA_ALTO} cm</strong></div>
                </>
              )}
            </div>
          </div>

          {/* Zoom */}
          <div className="preview-section">
            <div className="preview-section-label">
              ZOOM
              <span className="preview-zoom-label">{zoom}%</span>
              <button className="preview-zoom-reset" onClick={() => setZoom(90)}>RESET</button>
            </div>
            <div className="preview-zoom-bar">
              <span className="preview-zoom-icon">−</span>
              <input type="range" min={40} max={200} step={5} value={zoom}
                onChange={e => setZoom(Number(e.target.value))} className="preview-zoom-slider" />
              <span className="preview-zoom-icon">+</span>
            </div>
          </div>

          {/* Overflow warnings */}
          {overflowCount > 0 && (
            <div className="preview-section">
              <div className="preview-section-label preview-overflow-label">
                ⚠ OVERFLOW · {overflowCount} elemento{overflowCount > 1 ? 's' : ''}
              </div>
              <div className="preview-overflow-list">
                {activeEls.filter(el => overflowMap[el.id]?.any).map(el => {
                  const ov = overflowMap[el.id];
                  const dirs: string[] = [];
                  if (ov.top)    dirs.push(`↑ ${ov.topCm.toFixed(1)}cm`);
                  if (ov.bottom) dirs.push(`↓ ${ov.bottomCm.toFixed(1)}cm`);
                  if (ov.left)   dirs.push(`← ${ov.leftCm.toFixed(1)}cm`);
                  if (ov.right)  dirs.push(`→ ${ov.rightCm.toFixed(1)}cm`);
                  return (
                    <div key={el.id} className="preview-overflow-item"
                      onMouseEnter={() => setHoveredEl(el.id)}
                      onMouseLeave={() => setHoveredEl(null)}
                    >
                      <span className="preview-overflow-name">{el.label}</span>
                      <span className="preview-overflow-dirs">{dirs.join(' ')}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Elementos activos */}
          <div className="preview-section">
            <div className="preview-section-label">ELEMENTOS · {activeEls.length} activos</div>
            <div className="preview-el-list">
              {activeEls.length === 0
                ? <div className="preview-hint">Sin elementos activos en esta pieza</div>
                : activeEls.map(el => {
                  const hasOverflow = overflowMap[el.id]?.any;
                  return (
                    <div key={el.id}
                      className={`preview-el-item ${hoveredEl === el.id ? 'hovered' : ''} ${hasOverflow ? 'overflow' : ''}`}
                      onMouseEnter={() => setHoveredEl(el.id)}
                      onMouseLeave={() => setHoveredEl(null)}
                    >
                      <span className="preview-el-dot"
                        style={{ background: hasOverflow ? OVERFLOW_COLOR : (GROUP_COLORS[el.group ?? ''] ?? '#888') }} />
                      <span className="preview-el-name">{el.label}</span>
                      {hasOverflow && <span className="preview-el-warn">⚠</span>}
                    </div>
                  );
                })
              }
            </div>
          </div>

          {/* Leyenda */}
          {activeGroups.length > 0 && (
            <div className="preview-section">
              <div className="preview-section-label">LEYENDA</div>
              <div className="preview-legend">
                {activeGroups.map(group => (
                  <div key={group} className="preview-legend-item">
                    <span className="preview-legend-dot" style={{ background: GROUP_COLORS[group] ?? '#888' }} />
                    <span>{ELEMENT_GROUPS[group]?.label ?? group}</span>
                  </div>
                ))}
                {overflowCount > 0 && (
                  <div className="preview-legend-item">
                    <span className="preview-legend-dot" style={{ background: OVERFLOW_COLOR }} />
                    <span>OVERFLOW</span>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* ── RIGHT: SVG canvas ──────────────────────────────── */}
        <div className="preview-canvas">
          {talla === '' ? (
            <div className="preview-empty">Sin datos — cargá un Excel o configurá tallas primero</div>
          ) : (
            <div className="preview-svg-wrap" style={{ overflowY: zoom > 100 ? 'auto' : 'hidden' }}>
              <svg
                className="preview-svg"
                viewBox={`-2 -2 ${svgW + 4} ${svgH + 4}`}
                preserveAspectRatio="xMidYMid meet"
                style={{ width: `${zoom}%`, height: 'auto', minWidth: `${zoom}%` }}
              >
                {/* Silhouette */}
                <path d={silPath} style={{ fill: 'var(--pv-silhouette)', stroke: 'var(--pv-silhouette-stroke)' }} strokeWidth={strokeW} />

                {/* Grid — after silhouette so it renders on top */}
                {Array.from({ length: Math.floor(svgW) }, (_, i) => i + 1).map(x => (
                  <line key={`vg${x}`} x1={x} y1={0} x2={x} y2={svgH} style={{ stroke: 'var(--pv-grid)' }} strokeWidth={0.1} />
                ))}
                {Array.from({ length: Math.floor(svgH) }, (_, i) => i + 1).map(y => (
                  <line key={`hg${y}`} x1={0} y1={y} x2={svgW} y2={y} style={{ stroke: 'var(--pv-grid)' }} strokeWidth={0.1} />
                ))}

                {/* Center axis */}
                <line x1={svgW / 2} y1={0} x2={svgW / 2} y2={svgH}
                  style={{ stroke: 'var(--pv-axis)' }} strokeWidth={0.15}
                  strokeDasharray={`${svgW * 0.02} ${svgW * 0.02}`} />

                {/* Elements */}
                {activeEls.map(el => {
                  const rect = getElRect(el, rules, svgW, svgH);
                  if (!rect) return null;
                  const ov       = overflowMap[el.id];
                  const baseColor = GROUP_COLORS[el.group ?? ''] ?? '#888';
                  const color    = ov?.any ? OVERFLOW_COLOR : baseColor;
                  const isHovered = hoveredEl === el.id;
                  const { x, y, w, h, marginSup, marginInf, marginLat } = rect;

                  return (
                    <g key={el.id}
                      onMouseEnter={() => setHoveredEl(el.id)}
                      onMouseLeave={() => setHoveredEl(null)}
                      style={{ cursor: 'pointer' }}
                    >
                      {/* MARGIN_SUP guide */}
                      {marginSup !== undefined && marginSup > 0 && (
                        <g>
                          <line x1={x + w / 2} y1={0} x2={x + w / 2} y2={y}
                            stroke={color} strokeWidth={strokeW * 0.6}
                            strokeDasharray={`${svgW * 0.015} ${svgW * 0.015}`} opacity={0.5} />
                          <text x={x + w / 2 + svgW * 0.015} y={y / 2}
                            fill={color} fontSize={fontSizeSm} fontFamily="monospace" opacity={0.85}>
                            {marginSup}
                          </text>
                        </g>
                      )}

                      {/* MARGIN_INF guide */}
                      {marginInf !== undefined && marginInf > 0 && (
                        <g>
                          <line x1={x + w / 2} y1={y + h} x2={x + w / 2} y2={svgH}
                            stroke={color} strokeWidth={strokeW * 0.6}
                            strokeDasharray={`${svgW * 0.015} ${svgW * 0.015}`} opacity={0.5} />
                          <text x={x + w / 2 + svgW * 0.015} y={y + h + (svgH - y - h) / 2}
                            fill={color} fontSize={fontSizeSm} fontFamily="monospace" opacity={0.85}>
                            {marginInf}
                          </text>
                        </g>
                      )}

                      {/* MARGIN_LAT guide */}
                      {marginLat !== undefined && marginLat > 0 && (
                        x < svgW / 2 ? (
                          <g>
                            <line x1={0} y1={y + h / 2} x2={x} y2={y + h / 2}
                              stroke={color} strokeWidth={strokeW * 0.6}
                              strokeDasharray={`${svgW * 0.015} ${svgW * 0.015}`} opacity={0.5} />
                            <text x={x / 2} y={y + h / 2 - svgH * 0.01}
                              fill={color} fontSize={fontSizeSm} fontFamily="monospace" textAnchor="middle" opacity={0.85}>
                              {marginLat}
                            </text>
                          </g>
                        ) : (
                          <g>
                            <line x1={x + w} y1={y + h / 2} x2={svgW} y2={y + h / 2}
                              stroke={color} strokeWidth={strokeW * 0.6}
                              strokeDasharray={`${svgW * 0.015} ${svgW * 0.015}`} opacity={0.5} />
                            <text x={x + w + (svgW - x - w) / 2} y={y + h / 2 - svgH * 0.01}
                              fill={color} fontSize={fontSizeSm} fontFamily="monospace" textAnchor="middle" opacity={0.85}>
                              {marginLat}
                            </text>
                          </g>
                        )
                      )}

                      {/* Element rect */}
                      <rect x={x} y={y} width={w} height={h}
                        fill={color} fillOpacity={isHovered ? 0.45 : (ov?.any ? 0.25 : 0.2)}
                        stroke={color} strokeWidth={strokeW * (ov?.any ? 2 : isHovered ? 1.5 : 1)}
                        rx={svgW * 0.004}
                        strokeDasharray={ov?.any ? `${svgW * 0.02} ${svgW * 0.01}` : undefined}
                      />

                      {/* Label */}
                      {h > fontSize * 1.2 && w > fontSize * 2 && (
                        <text x={x + w / 2} y={y + h / 2}
                          textAnchor="middle" dominantBaseline="middle"
                          fill={color} fontSize={fontSize * 0.85}
                          fontFamily="monospace" fontWeight="bold" opacity={0.9}>
                          {el.label.length > 12 ? el.label.slice(0, 10) + '…' : el.label}
                        </text>
                      )}

                      {/* Dimensions */}
                      {h > fontSize * 2.5 && w > fontSize * 2 && (
                        <text x={x + w / 2} y={y + h / 2 + fontSize * 0.9}
                          textAnchor="middle" dominantBaseline="middle"
                          fill={color} fontSize={fontSizeSm * 0.85}
                          fontFamily="monospace" opacity={0.7}>
                          {w.toFixed(1)} × {h.toFixed(1)}
                        </text>
                      )}

                      {/* Overflow badge */}
                      {ov?.any && (
                        <text x={x + w - svgW * 0.01} y={y + svgH * 0.02}
                          textAnchor="end" dominantBaseline="hanging"
                          fill={OVERFLOW_COLOR} fontSize={fontSizeSm * 1.1}
                          fontFamily="monospace" fontWeight="bold">
                          ⚠
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Dimension labels */}
                <text x={svgW / 2} y={svgH + 1.5} textAnchor="middle"
                  style={{ fill: 'var(--pv-dim-label)' }} fontSize={fontSizeSm * 0.9} fontFamily="monospace">
                  {svgW.toFixed(1)} cm
                </text>
                <text x={-1.5} y={svgH / 2} textAnchor="middle"
                  style={{ fill: 'var(--pv-dim-label)' }} fontSize={fontSizeSm * 0.9} fontFamily="monospace"
                  transform={`rotate(-90, -1.5, ${svgH / 2})`}>
                  {svgH.toFixed(1)} cm
                </text>
              </svg>

              {/* Hover tooltip */}
              {hoveredEl && (() => {
                const el   = activeEls.find(e => e.id === hoveredEl);
                if (!el) return null;
                const rect = getElRect(el, rules, svgW, svgH);
                if (!rect) return null;
                const ov    = overflowMap[el.id];
                const color = ov?.any ? OVERFLOW_COLOR : (GROUP_COLORS[el.group ?? ''] ?? '#888');
                return (
                  <div className="preview-tooltip" style={{ borderColor: color }}>
                    <div className="preview-tooltip-title" style={{ color }}>{el.label}</div>
                    {ov?.any && (
                      <div className="preview-tooltip-overflow">
                        {ov.top    && <span>↑ {ov.topCm.toFixed(1)} cm</span>}
                        {ov.bottom && <span>↓ {ov.bottomCm.toFixed(1)} cm</span>}
                        {ov.left   && <span>← {ov.leftCm.toFixed(1)} cm</span>}
                        {ov.right  && <span>→ {ov.rightCm.toFixed(1)} cm</span>}
                      </div>
                    )}
                    {el.fields.map(f => {
                      const val = rules[f.key];
                      if (!val && val !== '0') return null;
                      return (
                        <div key={f.key} className="preview-tooltip-row">
                          <span className="preview-tooltip-key">{f.label}</span>
                          <span className="preview-tooltip-val">{val}{f.unit ? ` ${f.unit}` : ''}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
