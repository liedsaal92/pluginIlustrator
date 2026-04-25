// ============================================================
//  modules/configure/PiezaPreviewModal.tsx
//  Popup de preview de pieza desde RulesTab
// ============================================================
import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTallasStore, TALLAS_DEFAULT } from '../../store/useTallasStore';
import { useClientesStore } from '../../store/useClientesStore';
import { useMoldesStore } from '../../store/useMoldesStore';
import { SCHEMA, ELEMENT_GROUPS } from '../../utils/schema';
import type { PiezaKey, TallaDims, Rules, SchemaElement } from '../../types';

// ── Colours ──────────────────────────────────────────────────
const GROUP_COLORS: Record<string, string> = {
  identificacion: '#E84040',
  logos:          '#4A9BE8',
  sponsors:       '#F5C842',
  etiquetas:      '#9B59B6',
  decoracion:     '#27AE60',
  lineas:         '#E67E22',
};
const OVERFLOW_COLOR = '#FF3B3B';

// ── SVG helpers (mirrored from PreviewScreen) ─────────────────
interface ElRect {
  x: number; y: number; w: number; h: number;
  marginSup?: number; marginInf?: number; marginLat?: number;
}

function getElRect(el: SchemaElement, rules: Rules, svgW: number, svgH: number): ElRect | null {
  const wKey    = el.fields.find(f => f.key.endsWith('_ANCHO'))?.key;
  const hKey    = el.fields.find(f => f.key.endsWith('_ALTO'))?.key;
  const supKey  = el.fields.find(f => f.key.endsWith('_MARGIN_SUP'))?.key;
  const infKey  = el.fields.find(f => f.key.endsWith('_MARGIN_INF'))?.key;
  const latKey  = el.fields.find(f => f.key.endsWith('_MARGIN_LAT'))?.key;
  const ladoKey = el.fields.find(f => f.key.endsWith('_LADO'))?.key;

  const elW = parseFloat(rules[wKey ?? ''] ?? '') || 5;
  const elH = parseFloat(rules[hKey ?? ''] ?? '') || 3;
  const marginSup = supKey ? (parseFloat(rules[supKey] ?? '') || 0) : undefined;
  const marginInf = infKey ? (parseFloat(rules[infKey] ?? '') || 0) : undefined;
  const marginLat = latKey ? (parseFloat(rules[latKey] ?? '') || 0) : undefined;

  let y = marginSup !== undefined ? marginSup : marginInf !== undefined ? svgH - marginInf - elH : (svgH - elH) / 2;
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

function checkOverflow(rect: ElRect, svgW: number, svgH: number) {
  const leftCm   = Math.max(0, -rect.x);
  const rightCm  = Math.max(0, rect.x + rect.w - svgW);
  const topCm    = Math.max(0, -rect.y);
  const bottomCm = Math.max(0, rect.y + rect.h - svgH);
  return { left: leftCm > 0, right: rightCm > 0, top: topCm > 0, bottom: bottomCm > 0,
    any: leftCm > 0 || rightCm > 0 || topCm > 0 || bottomCm > 0,
    leftCm, rightCm, topCm, bottomCm };
}

function bodyPath(W: number, H: number) {
  return [`M ${(W*.12).toFixed(2)} 0`,`L ${(W*.36).toFixed(2)} 0`,
    `Q ${(W*.5).toFixed(2)} ${(H*.09).toFixed(2)} ${(W*.64).toFixed(2)} 0`,
    `L ${(W*.88).toFixed(2)} 0`,`L ${W.toFixed(2)} ${(H*.12).toFixed(2)}`,
    `L ${W.toFixed(2)} ${H.toFixed(2)}`,`L 0 ${H.toFixed(2)}`,`L 0 ${(H*.12).toFixed(2)}`,'Z'].join(' ');
}
function sleevePath(W: number, H: number) {
  const dh = H * 0.2;
  return [
    `M 0 ${H.toFixed(2)}`,
    `L ${W.toFixed(2)} ${H.toFixed(2)}`,
    `L ${W.toFixed(2)} 0`,
    `Q ${(W / 2).toFixed(2)} ${(-dh).toFixed(2)} 0 0`,
    'Z'
  ].join(' ');
}

// ── Component ─────────────────────────────────────────────────
interface Props {
  pieza: PiezaKey;
  talla: string;
  rules: Rules;
  onClose: () => void;
}

export function PiezaPreviewModal({ pieza, talla, rules, onClose }: Props) {
  const [zoom, setZoom]           = useState(85);
  const [hoveredEl, setHoveredEl] = useState<string | null>(null);
  const [clienteId, setClienteId] = useState('');
  const [moldeId,   setMoldeId]   = useState('');

  const clientes    = useClientesStore(s => s.clientes);
  const { moldes }  = useMoldesStore();
  const { getTallas } = useTallasStore();

  // Auto-select first molde
  useEffect(() => {
    if (!moldeId && moldes[0]) setMoldeId(moldes[0].id);
  }, [moldes, moldeId]);

  // Esc to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const tallaDimsMap = useMemo(
    () => (clienteId && moldeId) ? getTallas(clienteId, moldeId) : {},
    [clienteId, moldeId, getTallas]
  );

  const dims: TallaDims = (tallaDimsMap[talla]?.ANCHO)
    ? tallaDimsMap[talla]
    : (TALLAS_DEFAULT[talla] ?? { ALTO: '70', ANCHO: '50', MANGA_ANCHO: '40', MANGA_ALTO: '25' });

  const isBody  = pieza === 'frente' || pieza === 'espalda';
  const svgW    = isBody ? (parseFloat(dims.ANCHO) || 50)       : (parseFloat(dims.MANGA_ANCHO) || 40);
  const svgH    = isBody ? (parseFloat(dims.ALTO) || 70)        : (parseFloat(dims.MANGA_ALTO) || 25);
  const domeH   = isBody ? 0 : svgH * 0.21;
  const silPath = isBody ? bodyPath(svgW, svgH) : sleevePath(svgW, svgH);

  const piezaDef  = SCHEMA[pieza];
  const activeEls = piezaDef.elements.filter(el => el.toggleKey && rules[el.toggleKey] === 'SI');
  const activeGroups = [...new Set(activeEls.map(el => el.group ?? '').filter(Boolean))];

  const overflowMap = useMemo(() => {
    const map: Record<string, ReturnType<typeof checkOverflow>> = {};
    activeEls.forEach(el => {
      const rect = getElRect(el, rules, svgW, svgH);
      if (rect) map[el.id] = checkOverflow(rect, svgW, svgH);
    });
    return map;
  }, [activeEls, rules, svgW, svgH]);

  const overflowCount = Object.values(overflowMap).filter(v => v.any).length;
  const strokeW    = svgW * 0.006;
  const fontSize   = Math.max(svgW * 0.028, 1);
  const fontSizeSm = Math.max(svgW * 0.022, 0.8);

  return createPortal(
    <div className="rp-modal-overlay" onClick={onClose}>
      <div className="rp-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="rp-modal-header">
          <div className="rp-modal-title">
            <span className="rp-modal-pieza">{piezaDef.label}</span>
            <span className="rp-modal-talla">// {talla}</span>
            {overflowCount > 0 && (
              <span className="rp-modal-overflow-badge">⚠ {overflowCount} overflow</span>
            )}
          </div>
          <div className="rp-modal-controls">
            {/* Cliente */}
            {clientes.length > 0 && (
              <select className="rp-select" value={clienteId} onChange={e => setClienteId(e.target.value)}>
                <option value="">Tallas estándar</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            )}
            {/* Molde */}
            {moldes.length > 0 && (
              <select className="rp-select" value={moldeId} onChange={e => setMoldeId(e.target.value)}>
                {moldes.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
              </select>
            )}
            {/* Zoom */}
            <span className="rp-zoom-label">{zoom}%</span>
            <input type="range" min={40} max={180} step={5} value={zoom}
              onChange={e => setZoom(Number(e.target.value))} className="rp-zoom-slider" />
            <button className="rp-close" onClick={onClose}>×</button>
          </div>
        </div>

        {/* Canvas */}
        <div className="rp-canvas-wrap" style={{ overflowY: zoom > 100 ? 'auto' : 'hidden' }}>
          <svg
            className="rp-svg"
            viewBox={`-2 ${(-(domeH+2)).toFixed(2)} ${svgW + 4} ${svgH + domeH + 4}`}
            preserveAspectRatio="xMidYMid meet"
            style={{ width: `${zoom}%`, height: 'auto', minWidth: `${zoom}%` }}
          >
            {/* Grid */}
            {Array.from({ length: Math.floor(svgW) }, (_, i) => i + 1).map(x => (
              <line key={`vg${x}`} x1={x} y1={-2} x2={x} y2={svgH+2} stroke="#ffffff08" strokeWidth={0.1} />
            ))}
            {Array.from({ length: Math.floor(svgH) }, (_, i) => i + 1).map(y => (
              <line key={`hg${y}`} x1={-2} y1={y} x2={svgW+2} y2={y} stroke="#ffffff08" strokeWidth={0.1} />
            ))}
            {/* Center axis */}
            <line x1={svgW/2} y1={0} x2={svgW/2} y2={svgH}
              stroke="#ffffff18" strokeWidth={0.15}
              strokeDasharray={`${svgW*.02} ${svgW*.02}`} />
            {/* Silhouette */}
            <path d={silPath} fill="#1e2235" stroke="#3a4060" strokeWidth={strokeW} />

            {/* Elements */}
            {activeEls.map(el => {
              const rect = getElRect(el, rules, svgW, svgH);
              if (!rect) return null;
              const ov         = overflowMap[el.id];
              const baseColor  = GROUP_COLORS[el.group ?? ''] ?? '#888';
              const color      = ov?.any ? OVERFLOW_COLOR : baseColor;
              const isHovered  = hoveredEl === el.id;
              const { x, y, w, h, marginSup, marginInf, marginLat } = rect;
              return (
                <g key={el.id}
                  onMouseEnter={() => setHoveredEl(el.id)}
                  onMouseLeave={() => setHoveredEl(null)}
                  style={{ cursor: 'default' }}
                >
                  {marginSup !== undefined && marginSup > 0 && (
                    <g>
                      <line x1={x+w/2} y1={0} x2={x+w/2} y2={y}
                        stroke={color} strokeWidth={strokeW*.6}
                        strokeDasharray={`${svgW*.015} ${svgW*.015}`} opacity={0.5} />
                      <text x={x+w/2+svgW*.015} y={y/2}
                        fill={color} fontSize={fontSizeSm} fontFamily="monospace" opacity={0.85}>{marginSup}</text>
                    </g>
                  )}
                  {marginInf !== undefined && marginInf > 0 && (
                    <g>
                      <line x1={x+w/2} y1={y+h} x2={x+w/2} y2={svgH}
                        stroke={color} strokeWidth={strokeW*.6}
                        strokeDasharray={`${svgW*.015} ${svgW*.015}`} opacity={0.5} />
                      <text x={x+w/2+svgW*.015} y={y+h+(svgH-y-h)/2}
                        fill={color} fontSize={fontSizeSm} fontFamily="monospace" opacity={0.85}>{marginInf}</text>
                    </g>
                  )}
                  {marginLat !== undefined && marginLat > 0 && (
                    x < svgW/2 ? (
                      <g>
                        <line x1={0} y1={y+h/2} x2={x} y2={y+h/2}
                          stroke={color} strokeWidth={strokeW*.6}
                          strokeDasharray={`${svgW*.015} ${svgW*.015}`} opacity={0.5} />
                        <text x={x/2} y={y+h/2-svgH*.01}
                          fill={color} fontSize={fontSizeSm} fontFamily="monospace" textAnchor="middle" opacity={0.85}>{marginLat}</text>
                      </g>
                    ) : (
                      <g>
                        <line x1={x+w} y1={y+h/2} x2={svgW} y2={y+h/2}
                          stroke={color} strokeWidth={strokeW*.6}
                          strokeDasharray={`${svgW*.015} ${svgW*.015}`} opacity={0.5} />
                        <text x={x+w+(svgW-x-w)/2} y={y+h/2-svgH*.01}
                          fill={color} fontSize={fontSizeSm} fontFamily="monospace" textAnchor="middle" opacity={0.85}>{marginLat}</text>
                      </g>
                    )
                  )}
                  <rect x={x} y={y} width={w} height={h}
                    fill={color} fillOpacity={isHovered ? 0.45 : ov?.any ? 0.25 : 0.2}
                    stroke={color} strokeWidth={strokeW*(ov?.any ? 2 : isHovered ? 1.5 : 1)}
                    rx={svgW*.004}
                    strokeDasharray={ov?.any ? `${svgW*.02} ${svgW*.01}` : undefined}
                  />
                  {h > fontSize*1.2 && w > fontSize*2 && (
                    <text x={x+w/2} y={y+h/2}
                      textAnchor="middle" dominantBaseline="middle"
                      fill={color} fontSize={fontSize*.85} fontFamily="monospace" fontWeight="bold" opacity={0.9}>
                      {el.label.length > 12 ? el.label.slice(0,10)+'…' : el.label}
                    </text>
                  )}
                  {h > fontSize*2.5 && w > fontSize*2 && (
                    <text x={x+w/2} y={y+h/2+fontSize*.9}
                      textAnchor="middle" dominantBaseline="middle"
                      fill={color} fontSize={fontSizeSm*.85} fontFamily="monospace" opacity={0.7}>
                      {w.toFixed(1)} × {h.toFixed(1)}
                    </text>
                  )}
                  {ov?.any && (
                    <text x={x+w-svgW*.01} y={y+svgH*.02}
                      textAnchor="end" dominantBaseline="hanging"
                      fill={OVERFLOW_COLOR} fontSize={fontSizeSm*1.1} fontFamily="monospace" fontWeight="bold">⚠</text>
                  )}
                </g>
              );
            })}

            {/* Dimension labels */}
            <text x={svgW/2} y={svgH+1.5} textAnchor="middle"
              fill="#ffffff40" fontSize={fontSizeSm*.9} fontFamily="monospace">{svgW.toFixed(1)} cm</text>
            <text x={-1.5} y={svgH/2} textAnchor="middle"
              fill="#ffffff40" fontSize={fontSizeSm*.9} fontFamily="monospace"
              transform={`rotate(-90, -1.5, ${svgH/2})`}>{svgH.toFixed(1)} cm</text>
          </svg>

          {/* Hover tooltip */}
          {hoveredEl && (() => {
            const el   = activeEls.find(e => e.id === hoveredEl);
            if (!el) return null;
            const ov   = overflowMap[el.id];
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

        {/* Footer — legend */}
        {activeGroups.length > 0 && (
          <div className="rp-modal-footer">
            <div className="rp-legend">
              {activeGroups.map(g => (
                <div key={g} className="rp-legend-item">
                  <span className="rp-legend-dot" style={{ background: GROUP_COLORS[g] ?? '#888' }} />
                  <span>{ELEMENT_GROUPS[g]?.label ?? g}</span>
                </div>
              ))}
              {overflowCount > 0 && (
                <div className="rp-legend-item">
                  <span className="rp-legend-dot" style={{ background: OVERFLOW_COLOR }} />
                  <span>OVERFLOW</span>
                </div>
              )}
            </div>
            <span className="rp-active-count">{activeEls.length} elementos activos</span>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
