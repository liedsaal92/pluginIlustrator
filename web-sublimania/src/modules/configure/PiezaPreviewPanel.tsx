// ============================================================
//  modules/configure/PiezaPreviewPanel.tsx
//  Inline live-preview panel — third column in RulesTab
// ============================================================
import { useState, useMemo } from 'react';
import { useTallasStore, TALLAS_DEFAULT } from '../../store/useTallasStore';
import { useClientesStore } from '../../store/useClientesStore';
import { useMoldesStore } from '../../store/useMoldesStore';
import { SCHEMA } from '../../utils/schema';
import type { PiezaKey, TallaDims, Rules, SchemaElement } from '../../types';

const GROUP_COLORS: Record<string, string> = {
  identificacion: '#E84040', logos: '#4A9BE8', sponsors: '#F5C842',
  etiquetas: '#9B59B6', decoracion: '#27AE60', lineas: '#E67E22',
};
const OVERFLOW_COLOR = '#FF3B3B';

interface ElRect { x:number; y:number; w:number; h:number; marginSup?:number; marginInf?:number; marginLat?:number; }

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
  const y = marginSup !== undefined ? marginSup : marginInf !== undefined ? svgH - marginInf - elH : (svgH - elH) / 2;
  let x: number;
  if (marginLat === undefined) { x = (svgW - elW) / 2; }
  else { const isDer = (ladoKey ? rules[ladoKey] : null) === 'DER' || el.id.includes('_der') || el.id === 'logo_marca'; x = isDer ? svgW - marginLat - elW : marginLat; }
  return { x, y, w: elW, h: elH, marginSup, marginInf, marginLat };
}

function checkOverflow(r: ElRect, W: number, H: number) {
  const l = Math.max(0,-r.x), ri = Math.max(0,r.x+r.w-W), t = Math.max(0,-r.y), b = Math.max(0,r.y+r.h-H);
  return { any: l>0||ri>0||t>0||b>0, leftCm:l, rightCm:ri, topCm:t, bottomCm:b };
}

function bodyPath(W:number,H:number){return[`M ${(W*.12).toFixed(2)} 0`,`L ${(W*.36).toFixed(2)} 0`,`Q ${(W*.5).toFixed(2)} ${(H*.09).toFixed(2)} ${(W*.64).toFixed(2)} 0`,`L ${(W*.88).toFixed(2)} 0`,`L ${W.toFixed(2)} ${(H*.12).toFixed(2)}`,`L ${W.toFixed(2)} ${H.toFixed(2)}`,`L 0 ${H.toFixed(2)}`,`L 0 ${(H*.12).toFixed(2)}`,'Z'].join(' ');}
function sleevePath(W:number,H:number){
  const dh=H*.2;
  return[`M 0 ${H.toFixed(2)}`,`L ${W.toFixed(2)} ${H.toFixed(2)}`,`L ${W.toFixed(2)} 0`,`Q ${(W/2).toFixed(2)} ${(-dh).toFixed(2)} 0 0`,'Z'].join(' ');
}
function pantallonetaPath(W:number,H:number){return[`M 0 0`,`L ${W.toFixed(2)} 0`,`L ${W.toFixed(2)} ${H.toFixed(2)}`,`L 0 ${H.toFixed(2)}`,'Z'].join(' ');}

interface Props {
  pieza: PiezaKey;
  talla: string;
  rules: Rules;
  onClose: () => void;
  onExpand?: () => void;
}

export function PiezaPreviewPanel({ pieza, talla, rules, onClose, onExpand }: Props) {
  const [zoom, setZoom]           = useState(100);
  const [hoveredEl, setHoveredEl] = useState<string | null>(null);
  const [clienteId, setClienteId] = useState('');
  const [moldeId,   setMoldeId]   = useState('');

  const clientes   = useClientesStore(s => s.clientes);
  const { moldes } = useMoldesStore();
  const { getTallas } = useTallasStore();

  const tallaDimsMap = useMemo(
    () => (clienteId && moldeId) ? getTallas(clienteId, moldeId) : {},
    [clienteId, moldeId, getTallas]
  );

  const dims: TallaDims = tallaDimsMap[talla]?.ANCHO
    ? tallaDimsMap[talla]
    : (TALLAS_DEFAULT[talla] ?? { ALTO:'70', ANCHO:'50', MANGA_ANCHO:'40', MANGA_ALTO:'25' });

  const isBody  = pieza === 'frente' || pieza === 'espalda';
  const isPant  = pieza === 'pant_izq' || pieza === 'pant_der';
  const svgW    = isBody ? (parseFloat(dims.ANCHO) || 50)
               : isPant ? (parseFloat(rules['PANT_ANCHO'] ?? '') || 40)
               : (parseFloat(dims.MANGA_ANCHO) || 40);
  const svgH    = isBody ? (parseFloat(dims.ALTO)  || 70)
               : isPant ? (parseFloat(rules['PANT_ALTO'] ?? '') || 55)
               : (parseFloat(dims.MANGA_ALTO)  || 25);
  const domeH   = (isBody || isPant) ? 0 : svgH * 0.21;
  const silPath = isBody ? bodyPath(svgW, svgH) : isPant ? pantallonetaPath(svgW, svgH) : sleevePath(svgW, svgH);

  const piezaDef  = SCHEMA[pieza];
  const activeEls = piezaDef.elements.filter(el => el.toggleKey && rules[el.toggleKey] === 'SI');

  const overflowMap = useMemo(() => {
    const map: Record<string, ReturnType<typeof checkOverflow>> = {};
    activeEls.forEach(el => { const r = getElRect(el, rules, svgW, svgH); if (r) map[el.id] = checkOverflow(r, svgW, svgH); });
    return map;
  }, [activeEls, rules, svgW, svgH]);

  const overflowCount = Object.values(overflowMap).filter(v => v.any).length;
  const sw  = svgW * 0.007;
  const fs  = Math.max(svgW * 0.032, 1);
  const fss = Math.max(svgW * 0.024, 0.8);

  return (
    <div className="pp-panel">

      {/* Header */}
      <div className="pp-header">
        <div className="pp-header-left">
          <span className="pp-pieza">{piezaDef.label}</span>
          <span className="pp-talla">// {talla}</span>
          {overflowCount > 0 && <span className="pp-overflow-badge">⚠ {overflowCount}</span>}
        </div>
        <div className="pp-header-actions">
          {onExpand && (
            <button className="pp-expand" onClick={onExpand} title="Ver en pantalla completa">
              <svg viewBox="0 0 16 16" fill="none" width="13" height="13">
                <polyline points="10,2 14,2 14,6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="8.5" y1="7.5" x2="14" y2="2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                <polyline points="6,14 2,14 2,10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="7.5" y1="8.5" x2="2" y2="14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </button>
          )}
          <button className="pp-close" onClick={onClose} title="Cerrar preview">×</button>
        </div>
      </div>

      {/* Selects: cliente + molde */}
      <div className="pp-selects">
        {clientes.length > 0 && (
          <select className="pp-select" value={clienteId} onChange={e => setClienteId(e.target.value)}>
            <option value="">Estándar</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        )}
        {moldes.length > 0 && (
          <select className="pp-select" value={moldeId} onChange={e => setMoldeId(e.target.value)}>
            <option value="">Molde</option>
            {moldes.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>
        )}
      </div>

      {/* SVG canvas */}
      <div className="pp-canvas" style={{ overflowY: zoom > 110 ? 'auto' : 'hidden' }}>
        <svg
          className="pp-svg"
          viewBox={`-1 ${(-(domeH+1)).toFixed(2)} ${svgW+2} ${svgH+domeH+2}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ width: `${zoom}%`, height: 'auto', minWidth: `${zoom}%` }}
        >
          {/* Silhouette — first so grid renders on top */}
          <path d={silPath} style={{ fill: 'var(--pv-silhouette)', stroke: 'var(--pv-silhouette-stroke)' }} strokeWidth={sw}/>
          {/* Grid */}
          {Array.from({length:Math.floor(svgW)},(_,i)=>i+1).map(x=>(
            <line key={`v${x}`} x1={x} y1={-(domeH+1)} x2={x} y2={svgH+1} style={{ stroke: 'var(--pv-grid)' }} strokeWidth={0.12}/>
          ))}
          {Array.from({length:Math.floor(svgH)},(_,i)=>i+1).map(y=>(
            <line key={`h${y}`} x1={-1} y1={y} x2={svgW+1} y2={y} style={{ stroke: 'var(--pv-grid)' }} strokeWidth={0.12}/>
          ))}
          {/* Center axis */}
          <line x1={svgW/2} y1={0} x2={svgW/2} y2={svgH} style={{ stroke: 'var(--pv-axis)' }} strokeWidth={0.18}
            strokeDasharray={`${svgW*.02} ${svgW*.02}`}/>

          {/* Elements */}
          {activeEls.map(el => {
            const rect = getElRect(el, rules, svgW, svgH);
            if (!rect) return null;
            const ov        = overflowMap[el.id];
            const baseColor = GROUP_COLORS[el.group ?? ''] ?? '#888';
            const color     = ov?.any ? OVERFLOW_COLOR : baseColor;
            const hov       = hoveredEl === el.id;
            const {x,y,w,h,marginSup,marginInf,marginLat} = rect;
            return (
              <g key={el.id} onMouseEnter={()=>setHoveredEl(el.id)} onMouseLeave={()=>setHoveredEl(null)} style={{cursor:'default'}}>
                {marginSup!==undefined&&marginSup>0&&(
                  <g>
                    <line x1={x+w/2} y1={0} x2={x+w/2} y2={y} stroke={color} strokeWidth={sw*.5} strokeDasharray={`${svgW*.015} ${svgW*.015}`} opacity={0.45}/>
                    <text x={x+w/2+svgW*.012} y={y/2} fill={color} fontSize={fss} fontFamily="monospace" opacity={0.8}>{marginSup}</text>
                  </g>
                )}
                {marginInf!==undefined&&marginInf>0&&(
                  <g>
                    <line x1={x+w/2} y1={y+h} x2={x+w/2} y2={svgH} stroke={color} strokeWidth={sw*.5} strokeDasharray={`${svgW*.015} ${svgW*.015}`} opacity={0.45}/>
                    <text x={x+w/2+svgW*.012} y={y+h+(svgH-y-h)/2} fill={color} fontSize={fss} fontFamily="monospace" opacity={0.8}>{marginInf}</text>
                  </g>
                )}
                {marginLat!==undefined&&marginLat>0&&(
                  x<svgW/2?(
                    <g>
                      <line x1={0} y1={y+h/2} x2={x} y2={y+h/2} stroke={color} strokeWidth={sw*.5} strokeDasharray={`${svgW*.015} ${svgW*.015}`} opacity={0.45}/>
                      <text x={x/2} y={y+h/2-svgH*.01} fill={color} fontSize={fss} fontFamily="monospace" textAnchor="middle" opacity={0.8}>{marginLat}</text>
                    </g>
                  ):(
                    <g>
                      <line x1={x+w} y1={y+h/2} x2={svgW} y2={y+h/2} stroke={color} strokeWidth={sw*.5} strokeDasharray={`${svgW*.015} ${svgW*.015}`} opacity={0.45}/>
                      <text x={x+w+(svgW-x-w)/2} y={y+h/2-svgH*.01} fill={color} fontSize={fss} fontFamily="monospace" textAnchor="middle" opacity={0.8}>{marginLat}</text>
                    </g>
                  )
                )}
                <rect x={x} y={y} width={w} height={h}
                  fill={color} fillOpacity={hov?0.45:ov?.any?0.28:0.22}
                  stroke={color} strokeWidth={sw*(ov?.any?2:hov?1.5:1)}
                  rx={svgW*.004}
                  strokeDasharray={ov?.any?`${svgW*.02} ${svgW*.01}`:undefined}
                />
                {h>fs*1.2&&w>fs*2&&(
                  <text x={x+w/2} y={y+h/2} textAnchor="middle" dominantBaseline="middle"
                    fill={color} fontSize={fs*.82} fontFamily="monospace" fontWeight="bold" opacity={0.9}>
                    {el.label.length>10?el.label.slice(0,9)+'…':el.label}
                  </text>
                )}
                {h>fs*2.5&&w>fs*2&&(
                  <text x={x+w/2} y={y+h/2+fs*.9} textAnchor="middle" dominantBaseline="middle"
                    fill={color} fontSize={fss*.82} fontFamily="monospace" opacity={0.65}>
                    {w.toFixed(1)}×{h.toFixed(1)}
                  </text>
                )}
                {ov?.any&&(
                  <text x={x+w-svgW*.01} y={y+svgH*.02} textAnchor="end" dominantBaseline="hanging"
                    fill={OVERFLOW_COLOR} fontSize={fss*1.1} fontFamily="monospace" fontWeight="bold">⚠</text>
                )}
              </g>
            );
          })}
          <text x={svgW/2} y={svgH+1} textAnchor="middle" style={{ fill: 'var(--pv-dim-label)' }} fontSize={fss*.85} fontFamily="monospace">{svgW.toFixed(0)}×{svgH.toFixed(0)} cm</text>
        </svg>

        {/* Hover tooltip */}
        {hoveredEl&&(()=>{
          const el=activeEls.find(e=>e.id===hoveredEl); if(!el) return null;
          const ov=overflowMap[el.id];
          const color=ov?.any?OVERFLOW_COLOR:(GROUP_COLORS[el.group??'']??'#888');
          return(
            <div className="preview-tooltip" style={{borderColor:color}}>
              <div className="preview-tooltip-title" style={{color}}>{el.label}</div>
              {el.fields.map(f=>{const val=rules[f.key];if(!val&&val!=='0')return null;return(
                <div key={f.key} className="preview-tooltip-row">
                  <span className="preview-tooltip-key">{f.label}</span>
                  <span className="preview-tooltip-val">{val}{f.unit?` ${f.unit}`:''}</span>
                </div>
              );})}
            </div>
          );
        })()}
      </div>

      {/* Zoom */}
      <div className="pp-zoom">
        <button className="pp-zoom-btn" onClick={()=>setZoom(z=>Math.max(60,z-10))}>−</button>
        <span className="pp-zoom-val">{zoom}%</span>
        <input type="range" min={60} max={180} step={5} value={zoom}
          onChange={e=>setZoom(Number(e.target.value))} className="rp-zoom-slider"/>
        <button className="pp-zoom-btn" onClick={()=>setZoom(z=>Math.min(180,z+10))}>+</button>
      </div>

      {/* Footer: active elements */}
      <div className="pp-footer">
        {activeEls.length === 0
          ? <span className="pp-footer-empty">Sin elementos activos</span>
          : activeEls.map(el=>{
            const ov=overflowMap[el.id];
            const color=ov?.any?OVERFLOW_COLOR:(GROUP_COLORS[el.group??'']??'#888');
            return(
              <div key={el.id}
                className={`pp-el-row ${hoveredEl===el.id?'hovered':''} ${ov?.any?'overflow':''}`}
                onMouseEnter={()=>setHoveredEl(el.id)}
                onMouseLeave={()=>setHoveredEl(null)}
              >
                <span className="pp-el-dot" style={{background:color}}/>
                <span className="pp-el-name">{el.label}</span>
                {ov?.any&&<span className="pp-el-warn">⚠</span>}
              </div>
            );
          })
        }
      </div>
    </div>
  );
}
