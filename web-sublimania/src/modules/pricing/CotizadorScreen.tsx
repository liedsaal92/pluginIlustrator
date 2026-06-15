import { useMemo, useState } from 'react';
import { Spinner } from '../../components/ui/Spinner';
import { products } from '../../pricing/data/products';
import { calculateQuote } from '../../pricing/engines/pricingEngine';
import { usePricingStore } from '../../store/usePricingStore';
import { useClientesStore } from '../../store/useClientesStore';
import { useTiposClienteStore } from '../../store/useTiposClienteStore';
import { useTallasStore } from '../../store/useTallasStore';
import { useMoldesStore, MOLDE_DEFAULT_ID } from '../../store/useMoldesStore';
import type { CotizacionHistoryEntry, CustomerSegment, Gender, MarketProductId, OrderLine, PrintProfileId, ProductId, QuoteInput, QuoteResult } from '../../pricing/types';
import { openCotizacionPrintWindow } from '../../pricing/cotizacionPrint';

function parseTalla(t: string): { size: number; gender: Gender } {
  return { size: parseInt(t), gender: t.slice(-1).toUpperCase() as Gender };
}
function sortBySize(a: string, b: string) { return parseInt(a) - parseInt(b); }

interface Props {
  onToast: (msg: string, type: 'ok' | 'error') => void;
}

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const pct   = new Intl.NumberFormat('es-EC', { style: 'percent', maximumFractionDigits: 0 });
function fmt(v: number) { return money.format(v); }
function newId()        { return Math.random().toString(36).slice(2, 9); }
function newLine(rollWidthCm = 130): OrderLine {
  return { id: newId(), productId: 'camiseta', talla: '34H', quantity: 1, linearCm: 100, widthCm: rollWidthCm, manualPrice: '' };
}

export function CotizadorScreen({ onToast }: Props) {
  const [customerSegment, setCustomerSegment] = useState<CustomerSegment>('normal');
  const [profileId, setProfileId]             = useState<PrintProfileId>(
    () => usePricingStore.getState().config.defaultProfileId ?? 'normal'
  );
  const [orderLines, setOrderLines]           = useState<OrderLine[]>(() => [newLine(usePricingStore.getState().config.rollWidthCm)]);
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null);
  const [segmentOverridden, setSegmentOverridden] = useState(false);
  const [serviceMode, setServiceMode]             = useState<'sublimation' | 'full_service' | 'paper'>('sublimation');
  const [fabricCamisetaId, setFabricCamisetaId]   = useState<string | null>(null);
  const [fabricPantalonetaId, setFabricPantalonetaId] = useState<string | null>(null);
  const [saving, setSaving]     = useState(false);
  const [exporting, setExporting] = useState(false);

  const { config, basePrices, basePricesCompleto, cmPriceTiers, paperPriceTiers, supplies, machines, operations, volumeTiersByProduct, printProfiles, fabrics, competitors, saveQuote, cotizaciones, saveCotizacion, removeCotizacion, refClienteId, refGender, refClienteIdPant, refGenderPant, refMoldeIdPant } = usePricingStore();
  const { moldes } = useMoldesStore();
  const activeMoldeIdPant = refMoldeIdPant ?? moldes.find(m => m.tipo === 'pantaloneta')?.id ?? null;
  const enabledProfiles = useMemo(() => printProfiles.filter(p => p.enabled), [printProfiles]);
  const savingsTransferRate = customerSegment === 'vip'
    ? (config.savingsTransferRateVip ?? 0)
    : (config.savingsTransferRateNormal ?? 0);
  const { clientes } = useClientesStore();
  const { getSegmentoForCliente } = useTiposClienteStore();
  const { tallasPorCliente } = useTallasStore();

  const hTallas = useMemo(() =>
    [...new Set(basePrices.filter(r => r.gender === 'H').map(r => `${r.size}H`))].sort(sortBySize),
    [basePrices]);
  const mTallas = useMemo(() =>
    [...new Set(basePrices.filter(r => r.gender === 'M').map(r => `${r.size}M`))].sort(sortBySize),
    [basePrices]);

  const mktAvg = useMemo<Partial<Record<MarketProductId, number>>>(() => {
    const out: Partial<Record<MarketProductId, number>> = {};
    const keys: MarketProductId[] = ['camiseta', 'pantaloneta', 'equipo', 'por_cm'];
    for (const k of keys) {
      const prices = competitors.map(c => c.prices[k]).filter((p): p is number => p !== undefined && p > 0);
      if (prices.length > 0) out[k] = prices.reduce((s, p) => s + p, 0) / prices.length;
    }
    return out;
  }, [competitors]);

  const lineQuotes = useMemo<(QuoteResult | null)[]>(() =>
    orderLines.map(line => {
      const { size, gender } = parseTalla(line.talla);
      const pantDims = refClienteIdPant && refGenderPant && activeMoldeIdPant
        ? tallasPorCliente[refClienteIdPant]?.[activeMoldeIdPant]?.[line.talla]
        : undefined;
      const tallaDims = line.productId === 'pantaloneta'
        ? pantDims
        : (refClienteId && refGender
            ? tallasPorCliente[refClienteId]?.[MOLDE_DEFAULT_ID]?.[line.talla]
            : undefined);
      const tallaDimsPant = line.productId === 'equipo' ? pantDims : undefined;
      const input: QuoteInput = {
        customerSegment, gender, productId: line.productId, size,
        quantity: Math.max(1, line.quantity), profileId,
        profiles: printProfiles,
        basePrices, supplies, machines, operations,
        volumeTiers: volumeTiersByProduct[line.productId] ?? [],
        linearCm: line.linearCm,
        widthCm: line.productId === 'por_cm' && serviceMode === 'sublimation' ? line.widthCm : undefined,
        manualPrice: line.manualPrice.trim() ? Number(line.manualPrice) : undefined,
        savingsTransferRate, config, tallaDims, tallaDimsPant,
        serviceMode, fabrics,
        selectedFabricIdCamiseta: fabricCamisetaId,
        selectedFabricIdPantaloneta: fabricPantalonetaId,
        basePricesCompleto, cmPriceTiers, paperPriceTiers,
      };
      try { return calculateQuote(input); } catch { return null; }
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orderLines, customerSegment, profileId, printProfiles, basePrices, basePricesCompleto, cmPriceTiers, paperPriceTiers, supplies, machines, operations, volumeTiersByProduct, config, savingsTransferRate, serviceMode, fabrics, fabricCamisetaId, fabricPantalonetaId, refClienteId, refGender, refClienteIdPant, refGenderPant, activeMoldeIdPant, tallasPorCliente]
  );

  const totalPrice   = lineQuotes.reduce((s, q) => s + (q?.totalPrice ?? 0), 0);
  const totalProfit  = lineQuotes.reduce((s, q) => s + (q?.totalProfit ?? 0), 0);
  const totalCost    = lineQuotes.reduce((s, q) => s + (q?.cost.totalCost ?? 0), 0);
  const totalVolumeDiscount = lineQuotes.reduce((s, q) => s + (q?.volumeDiscountAmount ?? 0), 0);
  const totalTransferredSavings = lineQuotes.reduce((s, q) => s + (q ? q.transferredSavings * q.input.quantity : 0), 0);
  const totalRetainedSavings    = lineQuotes.reduce((s, q) => s + (q ? q.retainedSavings * q.input.quantity : 0), 0);
  const totalEcoSavings  = totalTransferredSavings + totalRetainedSavings;
  const overallMargin    = totalPrice > 0 ? totalProfit / totalPrice : 0;
  const totalUnits       = orderLines.reduce((s, l) => s + l.quantity, 0);
  const allAlerts        = lineQuotes.flatMap((q, i) => (q?.alerts ?? []).map(a => `L${i + 1}: ${a}`));
  const totalRecommended = lineQuotes.reduce((s, q) => s + (q ? q.recommendedUnitPrice * q.input.quantity : 0), 0);
  const belowMin         = totalPrice > 0 && totalPrice < totalRecommended;

  const profileTotals = useMemo(() =>
    enabledProfiles.map(profile => {
      let tp = 0, tpr = 0;
      for (const line of orderLines) {
        const { size, gender } = parseTalla(line.talla);
        const pantDims2 = refClienteIdPant && refGenderPant && activeMoldeIdPant
          ? tallasPorCliente[refClienteIdPant]?.[activeMoldeIdPant]?.[line.talla]
          : undefined;
        const tallaDims = line.productId === 'pantaloneta'
          ? pantDims2
          : (refClienteId && refGender
              ? tallasPorCliente[refClienteId]?.[MOLDE_DEFAULT_ID]?.[line.talla]
              : undefined);
        const tallaDimsPant = line.productId === 'equipo' ? pantDims2 : undefined;
        const input: QuoteInput = {
          customerSegment, gender, productId: line.productId, size,
          quantity: Math.max(1, line.quantity), profileId: profile.id,
          profiles: printProfiles,
          basePrices, supplies, machines, operations,
          volumeTiers: volumeTiersByProduct[line.productId] ?? [],
          linearCm: line.linearCm,
          widthCm: line.productId === 'por_cm' && serviceMode === 'sublimation' ? line.widthCm : undefined,
          manualPrice: line.manualPrice.trim() ? Number(line.manualPrice) : undefined,
          savingsTransferRate, config, tallaDims, tallaDimsPant,
          serviceMode, fabrics,
          selectedFabricIdCamiseta: fabricCamisetaId,
          selectedFabricIdPantaloneta: fabricPantalonetaId,
          basePricesCompleto, cmPriceTiers, paperPriceTiers,
        };
        try { const r = calculateQuote(input); tp += r.totalPrice; tpr += r.totalProfit; } catch { /**/ }
      }
      return { profileId: profile.id, totalPrice: tp, totalProfit: tpr, margin: tp > 0 ? tpr / (tp - tpr) : 0 };
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orderLines, customerSegment, enabledProfiles, printProfiles, basePrices, basePricesCompleto, cmPriceTiers, paperPriceTiers, supplies, machines, operations, volumeTiersByProduct, config, savingsTransferRate, serviceMode, fabrics, fabricCamisetaId, fabricPantalonetaId, refClienteId, refGender, refClienteIdPant, refGenderPant, activeMoldeIdPant, tallasPorCliente]
  );

  function addLine()    { setOrderLines(prev => [...prev, newLine(config.rollWidthCm)]); }
  function removeLine(id: string) {
    setOrderLines(prev => prev.length > 1 ? prev.filter(l => l.id !== id) : prev);
  }
  function updateLine<K extends keyof OrderLine>(id: string, key: K, value: OrderLine[K]) {
    setOrderLines(prev => prev.map(l => l.id === id ? { ...l, [key]: value } : l));
  }

  function buildCotizacionEntry(): CotizacionHistoryEntry | null {
    const validQuotes = lineQuotes.filter((q): q is NonNullable<typeof q> => q !== null);
    if (validQuotes.length === 0) { onToast('Sin líneas válidas para guardar', 'error'); return null; }
    const cliente = clientes.find(c => c.id === selectedClienteId);
    const fabricC = fabrics.find(f => f.id === fabricCamisetaId);
    const fabricP = fabrics.find(f => f.id === fabricPantalonetaId);
    const entry: CotizacionHistoryEntry = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      createdAt: new Date().toISOString(),
      clienteNombre: cliente?.nombre ?? '—',
      orgNombre: config.orgNombre ?? 'SUBLIMANIA',
      serviceMode: serviceMode === 'paper' ? 'paper' : serviceMode,
      fabricCamisetaNombre: fabricC?.name ?? null,
      fabricPantalonetaNombre: fabricP?.name ?? null,
      lines: orderLines.map((line, i) => {
        const q = lineQuotes[i];
        return {
          productId: line.productId,
          talla: line.talla,
          quantity: line.quantity,
          volumeDiscount: q?.volumeDiscount ?? 0,
          finalUnitPrice: q?.finalUnitPrice ?? 0,
          totalPrice: q?.totalPrice ?? 0,
        };
      }),
      totalUnits,
      totalPrice,
      totalProfit,
      overallMargin,
      editorState: {
        orderLines,
        selectedClienteId,
        customerSegment,
        profileId,
        serviceMode,
        fabricCamisetaId,
        fabricPantalonetaId,
      },
    };
    return entry;
  }

  function handleGuardarCotizacion() {
    const entry = buildCotizacionEntry();
    if (!entry) return;
    setSaving(true);
    saveCotizacion(entry);
    lineQuotes.forEach(q => { if (q) saveQuote(q); });
    onToast('Cotización guardada', 'ok');
    setTimeout(() => setSaving(false), 400);
  }

  function handleExportPdf() {
    const entry = buildCotizacionEntry();
    if (!entry) return;
    setExporting(true);
    saveCotizacion(entry);
    lineQuotes.forEach(q => { if (q) saveQuote(q); });
    openCotizacionPrintWindow(entry);
    setTimeout(() => setExporting(false), 400);
  }

  function handleCargarCotizacion(entry: CotizacionHistoryEntry) {
    const s = entry.editorState;
    setOrderLines(s.orderLines);
    setSelectedClienteId(s.selectedClienteId);
    setCustomerSegment(s.customerSegment);
    setProfileId(s.profileId);
    setServiceMode(s.serviceMode);
    setFabricCamisetaId(s.fabricCamisetaId);
    setFabricPantalonetaId(s.fabricPantalonetaId);
    setSegmentOverridden(!!s.selectedClienteId);
    onToast('Cotización cargada', 'ok');
  }

  const refMissing     = !refClienteId || !refGender;
  const refPantMissing = !refClienteIdPant || !refGenderPant;

  return (
    <div className="screen pricing-screen">
      {(refMissing || refPantMissing) && (
        <div className="cotizador-ref-banner">
          <span>⚠</span>
          <span>
            {refMissing && <>Sin referencia de tallas de <strong>camiseta</strong>. </>}
            {refPantMissing && <>Sin referencia de tallas de <strong>pantaloneta</strong>. </>}
            Los costos sin referencia usan la tabla por defecto. Configurá en <strong>COSTOS BASE → TALLAS DE REFERENCIA</strong>.
          </span>
        </div>
      )}

      <div className="pricing-header">
        <div>
          <h1 className="pricing-title">COTIZADOR</h1>
          <div className="pricing-subtitle">// Arma un pedido y obtén precios con márgenes</div>
        </div>
        <div className="pricing-header-actions">
          <button className="btn btn-ghost btn-sm" onClick={handleGuardarCotizacion} disabled={saving}>
            {saving ? <Spinner /> : null} GUARDAR COTIZACIÓN
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleExportPdf} disabled={exporting}>
            {exporting ? <Spinner /> : null} IMPRIMIR COTIZACIÓN
          </button>
        </div>
      </div>

      {/* ── Profile selector ──────────────────────────────────── */}
      <section className="pricing-panel pricing-profile-panel">
        <div className="pricing-panel-title">PERFIL DE IMPRESIÓN</div>
        <div className="pricing-profile-grid">
          {profileTotals.map(item => (
            <button key={item.profileId}
              className={`pricing-profile-card ${item.profileId === profileId ? 'active' : ''}`}
              onClick={() => setProfileId(item.profileId)}>
              <span>{printProfiles.find(p => p.id === item.profileId)?.name ?? item.profileId}</span>
              <strong>{fmt(item.totalPrice)}</strong>
              <small>Ganancia {fmt(item.totalProfit)} / Markup {pct.format(item.margin)}</small>
            </button>
          ))}
        </div>
      </section>

      {/* ── Modo de servicio ─────────────────────────────────── */}
      <section className="pricing-panel" style={{ padding: '1rem 1.25rem', marginTop: '1rem' }}>
        <div className="pricing-panel-title" style={{ marginBottom: '0.6rem' }}>MODO DE SERVICIO</div>
        <div className="pricing-transfer-btns">
          <button
            className={`pricing-transfer-btn pricing-transfer-btn--own${serviceMode === 'full_service' ? ' active' : ''}`}
            onClick={() => setServiceMode('full_service')}>
            <span className="pricing-transfer-badge">MIS PRODUCTOS</span>
            UNIFORME COMPLETO
          </button>
          <button
            className={`pricing-transfer-btn${serviceMode === 'sublimation' ? ' active' : ''}`}
            onClick={() => setServiceMode('sublimation')}>
            SOLO SUBLIMADO
          </button>
          <button
            className={`pricing-transfer-btn${serviceMode === 'paper' ? ' active' : ''}`}
            onClick={() => setServiceMode('paper')}>
            SOLO PAPEL
          </button>
        </div>

        {serviceMode === 'full_service' && (
          <div style={{ marginTop: '1rem' }}>
            {fabrics.length === 0 ? (
              <div className="pricing-table-sub" style={{ color: 'var(--red, #f44336)' }}>
                Sin telas configuradas — ir a <strong>COSTOS BASE → TELAS</strong> para agregar.
              </div>
            ) : (
              <div className="pricing-form-grid">
                <label className="pricing-field">
                  <span>TELA CAMISETA</span>
                  <select className="field-input field-select" value={fabricCamisetaId ?? ''}
                    onChange={e => setFabricCamisetaId(e.target.value || null)}>
                    <option value="">— Sin tela —</option>
                    {fabrics.map(f => {
                      const eff = f.metersPerKg * (f.tubular ? 2 : 1);
                      const ppm = eff > 0 ? f.costPerKg / eff : 0;
                      return <option key={f.id} value={f.id}>{f.name}{f.tubular ? ' (tubular)' : ''} — ${ppm.toFixed(2)}/m</option>;
                    })}
                  </select>
                </label>
                <label className="pricing-field">
                  <span>TELA PANTALONETA</span>
                  <select className="field-input field-select" value={fabricPantalonetaId ?? ''}
                    onChange={e => setFabricPantalonetaId(e.target.value || null)}>
                    <option value="">— Sin tela —</option>
                    {fabrics.map(f => {
                      const eff = f.metersPerKg * (f.tubular ? 2 : 1);
                      const ppm = eff > 0 ? f.costPerKg / eff : 0;
                      return <option key={f.id} value={f.id}>{f.name}{f.tubular ? ' (tubular)' : ''} — ${ppm.toFixed(2)}/m</option>;
                    })}
                  </select>
                </label>
              </div>
            )}
          </div>
        )}
      </section>

      <div className="pricing-grid">
        {/* ── Left: form ────────────────────────── */}
        <section className="pricing-panel pricing-form-panel">
          <div className="pricing-panel-title">DATOS DEL PEDIDO</div>
          <div className="pricing-form-grid">
            <label className="pricing-field">
              <span>CLIENTE</span>
              <select className="field-input field-select" value={selectedClienteId ?? ''} onChange={e => {
                const id = e.target.value || null;
                setSelectedClienteId(id);
                setSegmentOverridden(false);
                if (id) setCustomerSegment(getSegmentoForCliente(id));
              }}>
                <option value="">— Pedido sin cliente —</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </label>
            <label className="pricing-field">
              <span>SEGMENTO{selectedClienteId && !segmentOverridden ? ' ↳ AUTO' : ''}</span>
              <select className="field-input field-select" value={customerSegment} onChange={e => {
                setCustomerSegment(e.target.value as CustomerSegment);
                setSegmentOverridden(true);
              }}>
                <option value="normal">NORMAL</option>
                <option value="vip">VIP</option>
              </select>
            </label>
          </div>

          <div className="pricing-panel-title pricing-panel-title-spaced">LÍNEAS DEL PEDIDO</div>
          <div className="pricing-order-wrap">
            <table className="pricing-order-table">
              <thead>
                <tr><th>PRODUCTO</th><th>{serviceMode === 'sublimation' ? 'ALTO CM / ANCHO CM' : 'TALLA / CM'}</th><th>CANT.</th><th title="Dejá vacío para usar el precio calculado">PRECIO ($)</th><th>GANANCIA/U</th><th></th></tr>
              </thead>
              <tbody>
                {orderLines.map((line, i) => {
                  const q = lineQuotes[i];
                  const profit = q?.unitProfit ?? null;
                  return (
                  <tr key={line.id}>
                    <td data-label="Producto">
                      <select className="pricing-order-input pricing-order-select" value={line.productId}
                        onChange={e => updateLine(line.id, 'productId', e.target.value as ProductId)}>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name.toUpperCase()}</option>)}
                      </select>
                    </td>
                    <td data-label="Talla">
                      {line.productId === 'por_cm' ? (
                        serviceMode === 'sublimation' ? (
                          <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                            <input className="pricing-order-input" type="number" min="1"
                              value={line.linearCm} placeholder="ALTO" title="Alto (cm)"
                              style={{ width: '3.8rem' }}
                              onChange={e => updateLine(line.id, 'linearCm', Number(e.target.value))} />
                            <span style={{ fontSize: '0.65rem', opacity: 0.45, flexShrink: 0 }}>×</span>
                            <input className="pricing-order-input" type="number" min="1"
                              value={line.widthCm} placeholder="ANCHO" title="Ancho (cm)"
                              style={{ width: '3.8rem' }}
                              onChange={e => updateLine(line.id, 'widthCm', Number(e.target.value))} />
                          </div>
                        ) : (
                          <input className="pricing-order-input" type="number" min="1" value={line.linearCm}
                            onChange={e => updateLine(line.id, 'linearCm', Number(e.target.value))} placeholder="CM" />
                        )
                      ) : (
                        <select className="input-player" value={line.talla}
                          onChange={e => updateLine(line.id, 'talla', e.target.value)}>
                          {hTallas.length > 0 && (
                            <optgroup label="♂ HOMBRES" style={{ color: '#4A9BE8' }}>
                              {hTallas.map(t => <option key={t} value={t}>{t}</option>)}
                            </optgroup>
                          )}
                          {mTallas.length > 0 && (
                            <optgroup label="♀ MUJERES" style={{ color: '#F050A0' }}>
                              {mTallas.map(t => <option key={t} value={t}>{t}</option>)}
                            </optgroup>
                          )}
                        </select>
                      )}
                    </td>
                    <td data-label="Cant.">
                      <input className="pricing-order-input" type="number" min="1" value={line.quantity}
                        onChange={e => updateLine(line.id, 'quantity', Number(e.target.value))} />
                    </td>
                    <td data-label="Precio ($)">
                      <input className="pricing-order-input" type="number" min="0.01" step="0.01"
                        placeholder={q ? q.basePrice.toFixed(2) : '—'}
                        value={line.manualPrice}
                        onChange={e => updateLine(line.id, 'manualPrice', e.target.value)} />
                    </td>
                    <td data-label="Ganancia/u" className="pricing-order-profit-cell" style={{
                      color: profit === null ? undefined : profit >= 0 ? 'var(--green, #4caf50)' : 'var(--red, #f44336)',
                      fontVariantNumeric: 'tabular-nums',
                      fontSize: '0.78rem',
                      whiteSpace: 'nowrap',
                    }}>
                      {profit !== null ? fmt(profit) : '—'}
                    </td>
                    <td data-label="">
                      <button className="pricing-order-remove" onClick={() => removeLine(line.id)}>✕</button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
            <button className="pricing-order-add" onClick={addLine}>+ AGREGAR LÍNEA</button>
          </div>
        </section>

        {/* ── Right: result ─────────────────────── */}
        <section className="pricing-panel pricing-result-panel">
          <div className="pricing-panel-title">RESULTADO</div>
          <div className="pricing-hero-row">
            <div>
              <div
                className="pricing-hero-number"
                style={totalPrice > 0 ? (belowMin
                  ? { background: 'rgba(244,67,54,0.13)', color: '#f44336', borderColor: 'rgba(244,67,54,0.35)' }
                  : { background: 'rgba(76,175,80,0.13)',  color: '#2e7d32', borderColor: 'rgba(76,175,80,0.35)'  }
                ) : undefined}
              >
                {fmt(totalPrice)}
              </div>
              <div className="pricing-hero-label">TOTAL PEDIDO — {totalUnits} prenda{totalUnits !== 1 ? 's' : ''}</div>
            </div>
            {belowMin && (
              <div className="pricing-hero-min">
                <div className="pricing-hero-min-label">SUGERIDO</div>
                <div className="pricing-hero-min-value">{fmt(totalRecommended)}</div>
                <div className="pricing-hero-min-sub">para mantener markup</div>
              </div>
            )}
          </div>

          {/* ── COSTOS ───────────────────────────── */}
          <div className="pricing-kpi-section">
            <div className="pricing-kpi-section-label">COSTOS</div>
            <div className="pricing-kpis">
              {(() => {
                const totalPrint     = lineQuotes.reduce((s, q) => s + (q ? q.cost.printCostPerUnit     * q.input.quantity : 0), 0);
                const totalFabric    = lineQuotes.reduce((s, q) => s + (q ? q.cost.fabricCostPerUnit    * q.input.quantity : 0), 0);
                const totalTailoring = lineQuotes.reduce((s, q) => s + (q ? q.cost.tailoringCostPerUnit * q.input.quantity : 0), 0);
                const totalPolines   = lineQuotes.reduce((s, q) => s + (q ? q.cost.polinesCostPerUnit   * q.input.quantity : 0), 0);
                const showBreakdown  = serviceMode === 'full_service';
                return showBreakdown ? (<>
                  <div className="pricing-kpi"><span>Sublimado</span><strong>{fmt(totalPrint)}</strong></div>
                  {totalFabric    > 0 && <div className="pricing-kpi"><span>Tela</span><strong>{fmt(totalFabric)}</strong></div>}
                  {totalTailoring > 0 && <div className="pricing-kpi"><span>Costura</span><strong>{fmt(totalTailoring)}</strong></div>}
                  {totalPolines   > 0 && <div className="pricing-kpi"><span>Polines/medias</span><strong>{fmt(totalPolines)}</strong></div>}
                  <div className="pricing-kpi pricing-kpi-total"><span>Total costo</span><strong>{fmt(totalCost)}</strong></div>
                </>) : (
                  <div className="pricing-kpi"><span>Total costo</span><strong>{fmt(totalCost)}</strong></div>
                );
              })()}
            </div>
          </div>

          {/* ── RESULTADO ────────────────────────── */}
          <div className="pricing-kpi-section">
            <div className="pricing-kpi-section-label">RESULTADO</div>
            <div className="pricing-kpis">
              <div className="pricing-kpi"><span>Ganancia</span><strong>{fmt(totalProfit)}</strong></div>
              <div className="pricing-kpi"><span>Margen</span><strong>{pct.format(overallMargin)}</strong></div>
              {totalVolumeDiscount > 0 && (
                <div className="pricing-kpi pricing-kpi-discount">
                  <span>Desc. volumen</span><strong>−{fmt(totalVolumeDiscount)}</strong>
                </div>
              )}
            </div>
          </div>

          {totalEcoSavings > 0 && (
            <div className="pricing-savings-chain">
              <div className="pricing-savings-row pricing-savings-total">
                <span>Ahorro perfil ({printProfiles.find(p => p.id === profileId)?.name ?? profileId})</span>
                <strong>{fmt(totalEcoSavings)}</strong>
              </div>
              <div className="pricing-savings-row pricing-savings-transferred">
                <span>↳ Trasladado al cliente{savingsTransferRate > 0 ? ` (${Math.round(savingsTransferRate * 100)}%)` : ''}</span>
                <strong className="pricing-savings-down">{savingsTransferRate > 0 ? `−${fmt(totalTransferredSavings)}` : fmt(0)}</strong>
              </div>
              <div className="pricing-savings-row pricing-savings-retained">
                <span>↳ Retenido (ganancia extra)</span>
                <strong>{fmt(totalRetainedSavings)}</strong>
              </div>
            </div>
          )}

          <div className="pricing-breakdown-wrap">
            <table className="pricing-breakdown-table">
              <thead>
                <tr><th>#</th><th>PROD.</th><th>T.</th><th>CANT.</th><th>COSTO/U</th><th>DESC.</th><th>P/U</th><th>SUBTOTAL</th><th>MRG</th>{Object.keys(mktAvg).length > 0 && <th>MRK</th>}</tr>
              </thead>
              <tbody>
                {lineQuotes.map((q, i) => {
                  const pid = orderLines[i].productId as MarketProductId;
                  const avg = mktAvg[pid];
                  const mrkDelta = avg && q ? (q.finalUnitPrice - avg) / avg : null;
                  return (
                    <tr key={orderLines[i].id} className={q === null ? 'pricing-breakdown-error' : ''}>
                      <td data-label="#">{i + 1}</td>
                      <td data-label="Prod.">{orderLines[i].productId.toUpperCase()}</td>
                      <td data-label="T.">{orderLines[i].productId === 'por_cm'
                        ? (serviceMode === 'sublimation'
                          ? `${orderLines[i].linearCm}×${orderLines[i].widthCm}cm`
                          : `${orderLines[i].linearCm}cm`)
                        : orderLines[i].talla}
                      </td>
                      <td data-label="Cant.">{orderLines[i].quantity}</td>
                      <td data-label="Costo/u">{q ? fmt(q.cost.unitCost) : '—'}</td>
                      <td data-label="Desc." className={q && q.volumeDiscount > 0 ? 'pricing-discount-cell' : ''}>
                        {q && q.volumeDiscount > 0 ? `−${Math.round(q.volumeDiscount * 100)}%` : '—'}
                      </td>
                      <td data-label="P/u">
                        {q ? (
                          <>
                            {fmt(q.finalUnitPrice)}
                            {q.finalUnitPrice < q.recommendedUnitPrice && (
                              <div style={{ fontSize: '0.62rem', opacity: 0.45, lineHeight: 1.2, whiteSpace: 'nowrap' }}>
                                mín {fmt(q.recommendedUnitPrice)}
                              </div>
                            )}
                          </>
                        ) : '—'}
                      </td>
                      <td data-label="Subtotal">{q ? fmt(q.totalPrice) : 'ERR'}</td>
                      <td data-label="Mkp">{q ? pct.format(q.margin) : '—'}</td>
                      {Object.keys(mktAvg).length > 0 && (
                        <td data-label="Mrk" className={mrkDelta !== null ? (mrkDelta > 0.05 ? 'mkt-diff-above' : mrkDelta < -0.05 ? 'mkt-diff-below' : '') : ''}>
                          {mrkDelta !== null ? `${mrkDelta >= 0 ? '+' : ''}${Math.round(mrkDelta * 100)}%` : '—'}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3}><strong>TOTAL</strong></td>
                  <td><strong>{totalUnits}</strong></td>
                  <td></td>
                  <td>{totalVolumeDiscount > 0 && <span className="pricing-discount-cell">−{fmt(totalVolumeDiscount)}</span>}</td>
                  <td></td>
                  <td><strong>{fmt(totalPrice)}</strong></td>
                  <td><strong>{pct.format(overallMargin)}</strong></td>
                  {Object.keys(mktAvg).length > 0 && <td></td>}
                </tr>
              </tfoot>
            </table>
            <div className="pricing-breakdown-summary">
              <div className="pbs-row">
                <span className="pbs-label">CANT. TOTAL</span>
                <span className="pbs-value">{totalUnits}</span>
              </div>
              {totalVolumeDiscount > 0 && (
                <div className="pbs-row pbs-discount">
                  <span className="pbs-label">DESC. VOLUMEN</span>
                  <span className="pbs-value">−{fmt(totalVolumeDiscount)}</span>
                </div>
              )}
              <div className="pbs-row pbs-total">
                <span className="pbs-label">TOTAL</span>
                <span className="pbs-value">{fmt(totalPrice)}</span>
              </div>
              <div className="pbs-row">
                <span className="pbs-label">MARKUP</span>
                <span className="pbs-value">{pct.format(overallMargin)}</span>
              </div>
            </div>
          </div>

          <div className="pricing-alerts" aria-live="polite">
            {allAlerts.length === 0 ? (
              <div className="pricing-alert pricing-alert-ok">SIN ALERTAS FINANCIERAS</div>
            ) : allAlerts.map((alert, i) => (
              <div key={i} className="pricing-alert">{alert}</div>
            ))}
          </div>
        </section>
      </div>

      {/* ── Historial de cotizaciones ──────────────────────────── */}
      <section className="pricing-panel pricing-history-panel">
        <div className="pricing-history-head">
          <div className="pricing-panel-title">COTIZACIONES GUARDADAS</div>
        </div>
        {cotizaciones.length === 0 ? (
          <div className="pricing-empty-history">Sin cotizaciones guardadas. Usá GUARDAR o EXPORTAR PDF.</div>
        ) : (
          <div className="cot-history-list">
            {cotizaciones.slice(0, 15).map(entry => (
              <div key={entry.id} className="cot-history-row">
                <span className="cot-history-date">
                  {new Date(entry.createdAt).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
                <span className="cot-history-cliente">{entry.clienteNombre}</span>
                <span className="cot-history-lines">{entry.lines.length} línea{entry.lines.length !== 1 ? 's' : ''}</span>
                <span className="cot-history-total">{fmt(entry.totalPrice)}</span>
                <div className="cot-history-actions">
                  <button className="btn btn-ghost btn-sm" title="Cargar cotización en el editor"
                    onClick={() => handleCargarCotizacion(entry)}>CARGAR</button>
                  <button className="btn btn-ghost btn-sm" title="Re-imprimir PDF"
                    onClick={() => openCotizacionPrintWindow(entry)}>↓</button>
                  <button className="btn btn-ghost btn-sm cot-delete-btn" title="Eliminar"
                    onClick={() => removeCotizacion(entry.id)}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
