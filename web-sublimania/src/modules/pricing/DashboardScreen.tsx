// ============================================================
//  DashboardScreen — Análisis de márgenes y ahorros por talla
// ============================================================
import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';
import { calculateQuote } from '../../pricing/engines/pricingEngine';
import { compareProfiles } from '../../pricing/engines/simulator';
import { usePricingStore } from '../../store/usePricingStore';
import { useTallasStore } from '../../store/useTallasStore';
import { useMoldesStore, MOLDE_DEFAULT_ID } from '../../store/useMoldesStore';
import { sizeMeasurements } from '../../pricing/data/sizeMeasurements';
import type {
  CustomerSegment, Gender, ProductId, QuoteInput, QuoteResult, BasePriceField,
} from '../../pricing/types';

// ── tipos locales ────────────────────────────────────────────
type DashboardProductId = Exclude<ProductId, 'por_cm'>;
type ServiceMode = 'sublimation' | 'full_service';
type SortKey = 'size' | 'margin' | 'retainedSavings' | 'unitProfit' | 'finalUnitPrice';

interface DashboardControls {
  segment: CustomerSegment;
  gender: Gender;
  productId: DashboardProductId;
  profileId: string;
  quantity: number;
  serviceMode: ServiceMode;
}

interface DashboardRow {
  size: number;
  label: string;
  quote: QuoteResult;
  suggestedBase: number | null;
}

// ── constantes ───────────────────────────────────────────────
const SIZES = sizeMeasurements.map(s => s.size);

const PRODUCTS: { id: DashboardProductId; label: string }[] = [
  { id: 'camiseta',    label: 'CAMISETA' },
  { id: 'pantaloneta', label: 'PANTALONETA' },
  { id: 'equipo',      label: 'UNIFORME' },
];

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
const money = (v: number | undefined) => v !== undefined ? fmt.format(v) : '—';
const pct   = (v: number) => `${(v * 100).toFixed(1)}%`;

// ── hook de cálculo batch ────────────────────────────────────
function useDashboardData(controls: DashboardControls): DashboardRow[] {
  const {
    config, basePrices, basePricesCompleto,
    supplies, machines, operations,
    volumeTiersByProduct, printProfiles, fabrics,
    refClienteId, refGender, refClienteIdPant, refGenderPant, refMoldeIdPant,
  } = usePricingStore();
  const { tallasPorCliente } = useTallasStore();
  const { moldes } = useMoldesStore();
  const activeMoldeIdPant = refMoldeIdPant ?? moldes.find(m => m.tipo === 'pantaloneta')?.id ?? null;

  return useMemo(() => {
    const savingsTransferRate = controls.segment === 'vip'
      ? (config.savingsTransferRateVip ?? 0)
      : (config.savingsTransferRateNormal ?? 0);

    const rows: DashboardRow[] = [];
    for (const size of SIZES) {
      try {
        const tallaKey = `${size}${controls.gender}`;
        const tallaDims = controls.productId === 'pantaloneta'
          ? (refClienteIdPant && refGenderPant && activeMoldeIdPant
              ? tallasPorCliente[refClienteIdPant]?.[activeMoldeIdPant]?.[tallaKey]
              : undefined)
          : (refClienteId && refGender
              ? tallasPorCliente[refClienteId]?.[MOLDE_DEFAULT_ID]?.[tallaKey]
              : undefined);

        const input: QuoteInput = {
          customerSegment:  controls.segment,
          gender:           controls.gender,
          productId:        controls.productId,
          size,
          quantity:         controls.quantity,
          profileId:        controls.profileId,
          profiles:         printProfiles,
          basePrices,
          basePricesCompleto,
          supplies,
          machines,
          operations,
          volumeTiers: volumeTiersByProduct[controls.productId] ?? [],
          savingsTransferRate,
          config,
          tallaDims,
          serviceMode:      controls.serviceMode,
          fabrics,
          selectedFabricIdCamiseta:    controls.serviceMode === 'full_service' ? (config.defaultFabricCamisetaId ?? null)    : null,
          selectedFabricIdPantaloneta: controls.serviceMode === 'full_service' ? (config.defaultFabricPantalonetaId ?? null) : null,
        };
        const quote = calculateQuote(input);

        // Precio base sugerido — inversa de la fórmula del engine:
        // finalUnitPrice = basePrice*(1-vd) - transferredSavings
        // → basePrice = (minPrice + transferredSavings) / (1 - vd)
        let suggestedBase: number | null = null;
        if (quote.finalUnitPrice < quote.minPrice) {
          const divisor = 1 - quote.volumeDiscount;
          if (divisor > 0) {
            suggestedBase = Math.ceil(
              ((quote.minPrice + quote.transferredSavings) / divisor) * 100
            ) / 100;
          }
        }

        rows.push({ size, label: `${size}${controls.gender}`, quote, suggestedBase });
      } catch {
        // talla no configurada para este segmento/género — omitir
      }
    }
    return rows;
  }, [
    controls.segment, controls.gender, controls.productId,
    controls.profileId, controls.quantity, controls.serviceMode,
    basePrices, basePricesCompleto, supplies, machines,
    operations, volumeTiersByProduct, printProfiles, fabrics, config,
    refClienteId, refGender, refClienteIdPant, refGenderPant, activeMoldeIdPant, tallasPorCliente,
  ]);
}

// ── KPIs ─────────────────────────────────────────────────────
function computeKPIs(rows: DashboardRow[], minMargin: number) {
  if (!rows.length) return null;
  const avgMargin          = rows.reduce((s, r) => s + r.quote.margin, 0) / rows.length;
  const totalRetained      = rows.reduce((s, r) => s + r.quote.retainedSavings, 0);
  const belowFloor         = rows.filter(r => r.quote.finalUnitPrice < r.quote.minPrice).length;
  const best               = rows.reduce((a, b) => a.quote.margin > b.quote.margin ? a : b);
  const worst              = rows.reduce((a, b) => a.quote.margin < b.quote.margin ? a : b);
  return { avgMargin, totalRetained, belowFloor, best, worst, minMargin };
}

// ── color de margen ──────────────────────────────────────────
function marginCls(margin: number, minMargin: number) {
  if (margin >= 0.45) return 'db-margin-good';
  if (margin >= minMargin) return 'db-margin-warn';
  return 'db-margin-bad';
}
function marginHex(margin: number, minMargin: number) {
  if (margin >= 0.45) return 'var(--green)';
  if (margin >= minMargin) return '#ca8a04';
  return 'var(--red)';
}

// ── componente ───────────────────────────────────────────────
interface Props { onToast: (msg: string, type: 'ok' | 'error') => void; }

export function DashboardScreen({ onToast: _onToast }: Props) {
  const { config, printProfiles, fabrics, updateBasePrice, updateBasePriceCompleto } = usePricingStore();
  const enabledProfiles = useMemo(() => printProfiles.filter(p => p.enabled), [printProfiles]);

  const [controls, setControls] = useState<DashboardControls>({
    segment:     'normal',
    gender:      'H',
    productId:   'camiseta',
    profileId:   enabledProfiles[0]?.id ?? config.defaultProfileId,
    quantity:    1,
    serviceMode: 'sublimation',
  });
  const set = <K extends keyof DashboardControls>(k: K, v: DashboardControls[K]) =>
    setControls(prev => ({ ...prev, [k]: v }));

  const [sortKey, setSortKey]   = useState<SortKey>('size');
  const [sortDir, setSortDir]   = useState<'asc' | 'desc'>('asc');
  const [selectedSize, setSelectedSize] = useState<number | null>(null);
  const [editingBase, setEditingBase] = useState<{ size: number; value: number } | null>(null);
  const [editValue, setEditValue]     = useState('');

  const rows = useDashboardData(controls);
  const kpis = useMemo(() => computeKPIs(rows, config.minMargin), [rows, config.minMargin]);

  // ordenamiento
  const sortedRows = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const va =
        sortKey === 'size'             ? a.size :
        sortKey === 'margin'           ? a.quote.margin :
        sortKey === 'retainedSavings'  ? a.quote.retainedSavings :
        sortKey === 'unitProfit'       ? a.quote.unitProfit :
                                         a.quote.finalUnitPrice;
      const vb =
        sortKey === 'size'             ? b.size :
        sortKey === 'margin'           ? b.quote.margin :
        sortKey === 'retainedSavings'  ? b.quote.retainedSavings :
        sortKey === 'unitProfit'       ? b.quote.unitProfit :
                                         b.quote.finalUnitPrice;
      return sortDir === 'asc' ? va - vb : vb - va;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir('asc'); }
  }
  const sortIcon = (k: SortKey) => sortKey === k ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  // datos para charts
  const chartMarginData = sortedRows.map(r => ({
    talla:  r.label,
    margen: parseFloat((r.quote.margin * 100).toFixed(1)),
    color:  marginHex(r.quote.margin, config.minMargin),
  }));
  const chartSavingsData = sortedRows.map(r => ({
    talla:     r.label,
    retenido:  parseFloat(r.quote.retainedSavings.toFixed(3)),
    trasladado: parseFloat(r.quote.transferredSavings.toFixed(3)),
  }));
  const chartCostPriceData = sortedRows.map(r => ({
    talla:    r.label,
    costo:    parseFloat(r.quote.cost.unitCost.toFixed(2)),
    precio:   parseFloat(r.quote.finalUnitPrice.toFixed(2)),
    minPrecio: parseFloat(r.quote.minPrice.toFixed(2)),
  }));

  // comparación de perfiles para la talla seleccionada
  const profileComparison = useMemo<QuoteResult[]>(() => {
    if (selectedSize === null) return [];
    const state = usePricingStore.getState();
    const savingsTransferRate = controls.segment === 'vip'
      ? (state.config.savingsTransferRateVip ?? 0)
      : (state.config.savingsTransferRateNormal ?? 0);
    const input: QuoteInput = {
      customerSegment:  controls.segment,
      gender:           controls.gender,
      productId:        controls.productId,
      size:             selectedSize,
      quantity:         controls.quantity,
      profileId:        controls.profileId,
      profiles:         state.printProfiles,
      basePrices:       state.basePrices,
      basePricesCompleto: state.basePricesCompleto,
      supplies:         state.supplies,
      machines:         state.machines,
      operations:       state.operations,
      volumeTiers:      (state.volumeTiersByProduct[controls.productId] ?? []),
      savingsTransferRate,
      config:           state.config,
      serviceMode:      controls.serviceMode,
      fabrics:          state.fabrics,
    };
    try { return compareProfiles(input); }
    catch { return []; }
  }, [selectedSize, controls]);

  return (
    <div className="screen pricing-screen">

      {/* HEADER */}
      <div className="pricing-header">
        <div>
          <h1 className="pricing-title">DASHBOARD DE PRECIOS</h1>
          <div className="pricing-subtitle">
            // Análisis por talla · {rows.length} tallas calculadas
          </div>
        </div>
      </div>

      {/* CONTROLES */}
      <section className="pricing-panel db-controls-panel">
        <div className="pricing-panel-title">PARÁMETROS</div>
        <div className="db-controls-grid">
          <label className="pricing-field">
            <span>SEGMENTO</span>
            <select className="field-input field-select" value={controls.segment}
              onChange={e => set('segment', e.target.value as CustomerSegment)}>
              <option value="normal">Normal</option>
              <option value="vip">VIP</option>
            </select>
          </label>
          <label className="pricing-field">
            <span>GÉNERO</span>
            <select className="field-input field-select" value={controls.gender}
              onChange={e => set('gender', e.target.value as Gender)}>
              <option value="H">Hombres (H)</option>
              <option value="M">Mujeres (M)</option>
            </select>
          </label>
          <label className="pricing-field">
            <span>PRODUCTO</span>
            <select className="field-input field-select" value={controls.productId}
              onChange={e => set('productId', e.target.value as DashboardProductId)}>
              {PRODUCTS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </label>
          <label className="pricing-field">
            <span>PERFIL DE IMPRESIÓN</span>
            <select className="field-input field-select" value={controls.profileId}
              onChange={e => set('profileId', e.target.value)}>
              {enabledProfiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label className="pricing-field">
            <span>CANTIDAD</span>
            <input type="number" className="field-input" min={1} value={controls.quantity}
              onChange={e => set('quantity', Math.max(1, parseInt(e.target.value) || 1))} />
          </label>
          <label className="pricing-field">
            <span>MODO</span>
            <select className="field-input field-select" value={controls.serviceMode}
              onChange={e => set('serviceMode', e.target.value as ServiceMode)}>
              <option value="sublimation">Sublimado</option>
              <option value="full_service">Uniforme completo</option>
            </select>
          </label>
          {controls.serviceMode === 'full_service' && (
            <div className="pricing-table-sub" style={{ fontSize: '0.75rem', opacity: 0.8 }}>
              Tela camiseta: <strong>{fabrics.find(f => f.id === config.defaultFabricCamisetaId)?.name ?? '—'}</strong>
              {' · '}
              Tela pantaloneta: <strong>{fabrics.find(f => f.id === config.defaultFabricPantalonetaId)?.name ?? '—'}</strong>
              {(!config.defaultFabricCamisetaId && !config.defaultFabricPantalonetaId) && (
                <span style={{ color: 'var(--pricing-bad, #ef4444)', marginLeft: 4 }}>
                  (configurar en Costos Base → Confección)
                </span>
              )}
            </div>
          )}
        </div>
      </section>

      {/* KPIs */}
      {kpis && (
        <div className="db-kpi-row">
          <div className="pricing-kpi">
            <span>MARGEN PROMEDIO</span>
            <strong className={kpis.avgMargin >= 0.45 ? 'db-kpi-good' : kpis.avgMargin >= kpis.minMargin ? 'db-kpi-warn' : 'db-kpi-bad'}>
              {pct(kpis.avgMargin)}
            </strong>
          </div>
          <div className="pricing-kpi">
            <span>AHORRO ECO RETENIDO</span>
            <strong>{money(kpis.totalRetained)}</strong>
          </div>
          <div className={`pricing-kpi${kpis.belowFloor > 0 ? ' db-kpi-alert' : ''}`}>
            <span>TALLAS BAJO PISO FINANCIERO</span>
            <strong className={kpis.belowFloor > 0 ? 'db-kpi-bad' : 'db-kpi-good'}>
              {kpis.belowFloor} / {rows.length}
            </strong>
          </div>
          <div className="pricing-kpi">
            <span>MEJOR MARGEN · PEOR MARGEN</span>
            <strong>
              <span className="db-kpi-good">{kpis.best.label} {pct(kpis.best.quote.margin)}</span>
              {'  '}
              <span className="db-kpi-bad">{kpis.worst.label} {pct(kpis.worst.quote.margin)}</span>
            </strong>
          </div>
        </div>
      )}

      {/* TABLA ANALÍTICA */}
      <section className="pricing-panel db-table-panel">
        <div className="pricing-panel-title">ANÁLISIS POR TALLA</div>
        <div className="pricing-price-table-wrap">
          <table className="pricing-price-table db-analytics-table">
            <thead>
              <tr>
                <th className="db-sortable" onClick={() => toggleSort('size')}>TALLA{sortIcon('size')}</th>
                <th>PRECIO BASE</th>
                <th>COSTO REAL</th>
                <th className="db-sortable" onClick={() => toggleSort('finalUnitPrice')}>PRECIO FINAL{sortIcon('finalUnitPrice')}</th>
                <th className="db-sortable" onClick={() => toggleSort('unitProfit')}>GANANCIA{sortIcon('unitProfit')}</th>
                <th className="db-sortable" onClick={() => toggleSort('margin')}>MARGEN %{sortIcon('margin')}</th>
                <th className="db-sortable" onClick={() => toggleSort('retainedSavings')}>AHORRO RETENIDO{sortIcon('retainedSavings')}</th>
                <th>⚠</th>
                <th>PRECIO BASE SUGERIDO</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map(row => (
                <tr
                  key={row.size}
                  className={`db-row${selectedSize === row.size ? ' db-row-selected' : ''}`}
                  onClick={() => setSelectedSize(selectedSize === row.size ? null : row.size)}
                >
                  <td><strong>{row.label}</strong></td>
                  <td>{money(row.quote.basePrice)}</td>
                  <td>{money(row.quote.cost.unitCost)}</td>
                  <td>{money(row.quote.finalUnitPrice)}</td>
                  <td>{money(row.quote.unitProfit)}</td>
                  <td className={marginCls(row.quote.margin, config.minMargin)}>
                    {pct(row.quote.margin)}
                  </td>
                  <td>{money(row.quote.retainedSavings)}</td>
                  <td>
                    {row.quote.alerts.length > 0 && (
                      <span className="db-alert-icon" title={row.quote.alerts.join(' · ')}>⚠</span>
                    )}
                  </td>
                  <td className={row.suggestedBase !== null ? 'db-suggested' : ''}>
                    {row.suggestedBase !== null
                      ? <button className="db-suggested-btn" onClick={() => {
                          setEditingBase({ size: row.size, value: row.suggestedBase! });
                          setEditValue(String(row.suggestedBase!));
                        }}>
                          {money(row.suggestedBase)}
                        </button>
                      : '—'
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {selectedSize && (
          <p className="pricing-table-sub" style={{ marginTop: '0.5rem' }}>
            Talla {selectedSize}{controls.gender} seleccionada — comparación de perfiles abajo
          </p>
        )}
      </section>

      {/* CHARTS */}
      <div className="db-charts-grid">

        <section className="pricing-panel db-chart-panel">
          <div className="pricing-panel-title">MARGEN % POR TALLA</div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartMarginData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
              <XAxis dataKey="talla" tick={{ fontSize: 11 }} />
              <YAxis unit="%" domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Bar dataKey="margen" radius={0} maxBarSize={32}>
                {chartMarginData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} stroke="var(--black)" strokeWidth={1} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className="pricing-panel db-chart-panel">
          <div className="pricing-panel-title">AHORRO ECO: RETENIDO vs TRASLADADO</div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartSavingsData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
              <XAxis dataKey="talla" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => money(typeof v === 'number' ? v : undefined)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="retenido"   stackId="a" fill="var(--green)" stroke="var(--black)" strokeWidth={1} maxBarSize={32} name="Retenido" />
              <Bar dataKey="trasladado" stackId="a" fill="var(--cyan)"  stroke="var(--black)" strokeWidth={1} maxBarSize={32} name="Trasladado" />
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className="pricing-panel db-chart-panel db-chart-full">
          <div className="pricing-panel-title">COSTO · PRECIO FINAL · PRECIO MÍNIMO</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartCostPriceData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
              <XAxis dataKey="talla" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => money(typeof v === 'number' ? v : undefined)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line dataKey="costo"     stroke="var(--red)"    strokeWidth={2} dot={false} name="Costo real" />
              <Line dataKey="precio"    stroke="var(--blue)"   strokeWidth={2} dot={false} name="Precio final" />
              <Line dataKey="minPrecio" stroke="var(--orange)" strokeWidth={2} strokeDasharray="4 2" dot={false} name="Precio mínimo" />
            </LineChart>
          </ResponsiveContainer>
        </section>

      </div>

      {/* COMPARACIÓN DE PERFILES */}
      {selectedSize !== null && profileComparison.length > 0 && (
        <section className="pricing-panel db-comparison-panel">
          <div className="pricing-panel-title">
            COMPARACIÓN DE PERFILES — TALLA {selectedSize}{controls.gender}
          </div>
          <div className="pricing-price-table-wrap">
            <table className="pricing-price-table">
              <thead>
                <tr>
                  <th>PERFIL</th>
                  <th>COSTO REAL</th>
                  <th>PRECIO FINAL</th>
                  <th>MARGEN %</th>
                  <th>AHORRO RETENIDO</th>
                  <th>AHORRO TRASLADADO</th>
                </tr>
              </thead>
              <tbody>
                {profileComparison.map(q => {
                  const prof = printProfiles.find(p => p.id === q.input.profileId);
                  return (
                    <tr key={q.input.profileId}
                        className={q.input.profileId === controls.profileId ? 'db-row-selected' : ''}>
                      <td><strong>{prof?.name ?? q.input.profileId}</strong></td>
                      <td>{money(q.cost.unitCost)}</td>
                      <td>{money(q.finalUnitPrice)}</td>
                      <td className={marginCls(q.margin, config.minMargin)}>{pct(q.margin)}</td>
                      <td>{money(q.retainedSavings)}</td>
                      <td>{money(q.transferredSavings)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {editingBase && (
        <BasePricePopup
          editing={editingBase}
          editValue={editValue}
          controls={controls}
          onChange={setEditValue}
          onConfirm={confirmEditBase}
          onClose={() => setEditingBase(null)}
        />
      )}
    </div>
  );

  function confirmEditBase() {
    if (!editingBase) return;
    const val = parseFloat(editValue);
    if (!Number.isFinite(val) || val <= 0) return;
    const field = controls.productId as BasePriceField;
    if (controls.serviceMode === 'full_service') {
      updateBasePriceCompleto(controls.segment, controls.gender, editingBase.size, field, val);
    } else {
      updateBasePrice(controls.segment, controls.gender, editingBase.size, field, val);
    }
    setEditingBase(null);
  }
}

function BasePricePopup({ editing, editValue, controls, onChange, onConfirm, onClose }: {
  editing: { size: number; value: number };
  editValue: string;
  controls: { gender: string; serviceMode: string; segment: string; productId: string };
  onChange: (v: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return createPortal(
    <div className="db-popup-overlay" onClick={onClose}>
      <div className="db-popup" onClick={e => e.stopPropagation()}>
        <div className="db-popup-title">EDITAR PRECIO BASE — TALLA {editing.size}{controls.gender}</div>
        <div className="db-popup-sub">
          {controls.serviceMode === 'full_service' ? 'Tabla: Uniforme Completo' : 'Tabla: Sublimado'} · {controls.segment.toUpperCase()} · {controls.productId.toUpperCase()}
        </div>
        <input
          className="field-input db-popup-input"
          type="number"
          step="0.01"
          min="0"
          value={editValue}
          onChange={e => onChange(e.target.value)}
          autoFocus
          onKeyDown={e => {
            if (e.key === 'Enter') onConfirm();
            if (e.key === 'Escape') onClose();
          }}
        />
        <div className="db-popup-actions">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>CANCELAR</button>
          <button className="btn btn-primary btn-sm" onClick={onConfirm}>CONFIRMAR</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
