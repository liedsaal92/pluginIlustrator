import { useMemo, useState } from 'react';
import { products } from '../../pricing/data/products';
import { calculateQuote } from '../../pricing/engines/pricingEngine';
import { validateQuoteInput } from '../../pricing/validation';
import { usePricingStore } from '../../store/usePricingStore';
import { useClientesStore } from '../../store/useClientesStore';
import { useTiposClienteStore } from '../../store/useTiposClienteStore';
import { useTallasStore } from '../../store/useTallasStore';
import { MOLDE_DEFAULT_ID } from '../../store/useMoldesStore';
import type { CustomerSegment, Gender, MarketProductId, PrintProfileId, ProductId, QuoteInput, QuoteResult } from '../../pricing/types';

interface OrderLine {
  id: string;
  productId: ProductId;
  talla: string;   // "34H" | "34M" | etc.
  quantity: number;
  linearCm: number;
  manualPrice: string;
}

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
function newLine(): OrderLine {
  return { id: newId(), productId: 'camiseta', talla: '34H', quantity: 1, linearCm: 100, manualPrice: '' };
}

export function CotizadorScreen({ onToast }: Props) {
  const [customerSegment, setCustomerSegment] = useState<CustomerSegment>('normal');
  const [profileId, setProfileId]             = useState<PrintProfileId>(
    () => usePricingStore.getState().config.defaultProfileId ?? 'normal'
  );
  const [orderLines, setOrderLines]           = useState<OrderLine[]>([newLine()]);
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null);
  const [segmentOverridden, setSegmentOverridden] = useState(false);

  const { config, basePrices, supplies, machines, operations, volumeTiers, printProfiles, competitors, history, saveQuote, clearHistory, refClienteId, refGender } = usePricingStore();
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
      const tallaDims = (refClienteId && refGender)
        ? tallasPorCliente[refClienteId]?.[MOLDE_DEFAULT_ID]?.[line.talla]
        : undefined;
      const input: QuoteInput = {
        customerSegment, gender, productId: line.productId, size,
        quantity: Math.max(1, line.quantity), profileId,
        profiles: printProfiles,
        basePrices, supplies, machines, operations, volumeTiers,
        linearCm: line.linearCm,
        manualPrice: line.manualPrice.trim() ? Number(line.manualPrice) : undefined,
        savingsTransferRate, config, tallaDims,
      };
      try { return calculateQuote(input); } catch { return null; }
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orderLines, customerSegment, profileId, printProfiles, basePrices, supplies, machines, operations, volumeTiers, config, savingsTransferRate, refClienteId, refGender, tallasPorCliente]
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

  const profileTotals = useMemo(() =>
    enabledProfiles.map(profile => {
      let tp = 0, tpr = 0;
      for (const line of orderLines) {
        const { size, gender } = parseTalla(line.talla);
        const tallaDims = (refClienteId && refGender)
          ? tallasPorCliente[refClienteId]?.[MOLDE_DEFAULT_ID]?.[line.talla]
          : undefined;
        const input: QuoteInput = {
          customerSegment, gender, productId: line.productId, size,
          quantity: Math.max(1, line.quantity), profileId: profile.id,
          profiles: printProfiles,
          basePrices, supplies, machines, operations, volumeTiers,
          linearCm: line.linearCm,
          manualPrice: line.manualPrice.trim() ? Number(line.manualPrice) : undefined,
          savingsTransferRate, config, tallaDims,
        };
        try { const r = calculateQuote(input); tp += r.totalPrice; tpr += r.totalProfit; } catch { /**/ }
      }
      return { profileId: profile.id, totalPrice: tp, totalProfit: tpr, margin: tp > 0 ? tpr / tp : 0 };
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orderLines, customerSegment, enabledProfiles, printProfiles, basePrices, supplies, machines, operations, volumeTiers, config, savingsTransferRate, refClienteId, refGender, tallasPorCliente]
  );

  function addLine()    { setOrderLines(prev => [...prev, newLine()]); }
  function removeLine(id: string) {
    setOrderLines(prev => prev.length > 1 ? prev.filter(l => l.id !== id) : prev);
  }
  function updateLine<K extends keyof OrderLine>(id: string, key: K, value: OrderLine[K]) {
    setOrderLines(prev => prev.map(l => l.id === id ? { ...l, [key]: value } : l));
  }

  function handleSaveQuote() {
    const errors: string[] = [];
    orderLines.forEach((line, i) => {
      const { size, gender } = parseTalla(line.talla);
      const tallaDims = (refClienteId && refGender)
        ? tallasPorCliente[refClienteId]?.[MOLDE_DEFAULT_ID]?.[line.talla]
        : undefined;
      const input: QuoteInput = {
        customerSegment, gender, productId: line.productId, size,
        quantity: Math.max(1, line.quantity), profileId,
        profiles: printProfiles,
        basePrices, supplies, machines, operations, volumeTiers,
        linearCm: line.linearCm,
        manualPrice: line.manualPrice.trim() ? Number(line.manualPrice) : undefined,
        savingsTransferRate, config, tallaDims,
      };
      validateQuoteInput(input).forEach(e => errors.push(`L${i + 1}: ${e}`));
    });
    if (errors.length > 0) { onToast(errors[0], 'error'); return; }
    let saved = 0;
    lineQuotes.forEach(q => { if (q) { saveQuote(q); saved++; } });
    onToast(`${saved} línea(s) guardadas`, 'ok');
  }

  const refMissing = !refClienteId || !refGender;

  return (
    <div className="screen pricing-screen">
      {refMissing && (
        <div className="cotizador-ref-banner">
          <span>⚠</span>
          <span>Sin referencia de tallas configurada — los costos usan la tabla por defecto.
            Ingresá a <strong>COSTOS BASE → TALLAS DE REFERENCIA</strong>, seleccioná un cliente con sus tallas cargadas y el género de referencia.
          </span>
        </div>
      )}

      <div className="pricing-header">
        <div>
          <h1 className="pricing-title">COTIZADOR</h1>
          <div className="pricing-subtitle">// Arma un pedido y obtén precios con márgenes</div>
        </div>
        <div className="pricing-header-actions">
          <button className="btn btn-primary btn-sm" onClick={handleSaveQuote}>GUARDAR COTIZACION</button>
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
              <small>Ganancia {fmt(item.totalProfit)} / Margen {pct.format(item.margin)}</small>
            </button>
          ))}
        </div>
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
                <tr><th>PRODUCTO</th><th>TALLA / CM</th><th>CANT.</th><th title="Dejá vacío para usar el precio calculado">PRECIO ($)</th><th>GANANCIA/U</th><th></th></tr>
              </thead>
              <tbody>
                {orderLines.map((line, i) => {
                  const q = lineQuotes[i];
                  const profit = q?.unitProfit ?? null;
                  return (
                  <tr key={line.id}>
                    <td>
                      <select className="pricing-order-input pricing-order-select" value={line.productId}
                        onChange={e => updateLine(line.id, 'productId', e.target.value as ProductId)}>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name.toUpperCase()}</option>)}
                      </select>
                    </td>
                    <td>
                      {line.productId === 'por_cm' ? (
                        <input className="pricing-order-input" type="number" min="1" value={line.linearCm}
                          onChange={e => updateLine(line.id, 'linearCm', Number(e.target.value))} placeholder="CM" />
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
                    <td>
                      <input className="pricing-order-input" type="number" min="1" value={line.quantity}
                        onChange={e => updateLine(line.id, 'quantity', Number(e.target.value))} />
                    </td>
                    <td>
                      <input className="pricing-order-input" type="number" min="0.01" step="0.01" placeholder="auto"
                        value={line.manualPrice}
                        onChange={e => updateLine(line.id, 'manualPrice', e.target.value)} />
                    </td>
                    <td className="pricing-order-profit-cell" style={{
                      color: profit === null ? undefined : profit >= 0 ? 'var(--green, #4caf50)' : 'var(--red, #f44336)',
                      fontVariantNumeric: 'tabular-nums',
                      fontSize: '0.78rem',
                      whiteSpace: 'nowrap',
                    }}>
                      {profit !== null ? fmt(profit) : '—'}
                    </td>
                    <td>
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
          <div className="pricing-hero-number">{fmt(totalPrice)}</div>
          <div className="pricing-hero-label">TOTAL PEDIDO — {totalUnits} prenda{totalUnits !== 1 ? 's' : ''}</div>

          <div className="pricing-kpis">
            <div className="pricing-kpi"><span>Costo total</span><strong>{fmt(totalCost)}</strong></div>
            <div className="pricing-kpi"><span>Ganancia total</span><strong>{fmt(totalProfit)}</strong></div>
            <div className="pricing-kpi"><span>Margen</span><strong>{pct.format(overallMargin)}</strong></div>
            {totalVolumeDiscount > 0 && (
              <div className="pricing-kpi pricing-kpi-discount">
                <span>Desc. volumen</span>
                <strong>−{fmt(totalVolumeDiscount)}</strong>
              </div>
            )}
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
                      <td>{i + 1}</td>
                      <td>{orderLines[i].productId.toUpperCase()}</td>
                      <td>{orderLines[i].productId === 'por_cm' ? `${orderLines[i].linearCm}cm` : orderLines[i].talla}</td>
                      <td>{orderLines[i].quantity}</td>
                      <td>{q ? fmt(q.cost.unitCost) : '—'}</td>
                      <td className={q && q.volumeDiscount > 0 ? 'pricing-discount-cell' : ''}>
                        {q && q.volumeDiscount > 0 ? `−${Math.round(q.volumeDiscount * 100)}%` : '—'}
                      </td>
                      <td>
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
                      <td>{q ? fmt(q.totalPrice) : 'ERR'}</td>
                      <td>{q ? pct.format(q.margin) : '—'}</td>
                      {Object.keys(mktAvg).length > 0 && (
                        <td className={mrkDelta !== null ? (mrkDelta > 0.05 ? 'mkt-diff-above' : mrkDelta < -0.05 ? 'mkt-diff-below' : '') : ''}>
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
          </div>

          <div className="pricing-alerts">
            {allAlerts.length === 0 ? (
              <div className="pricing-alert pricing-alert-ok">SIN ALERTAS FINANCIERAS</div>
            ) : allAlerts.map((alert, i) => (
              <div key={i} className="pricing-alert">{alert}</div>
            ))}
          </div>
        </section>
      </div>

      {/* ── History ────────────────────────────────────────────── */}
      <section className="pricing-panel pricing-history-panel">
        <div className="pricing-history-head">
          <div className="pricing-panel-title">HISTORIAL LOCAL</div>
          {history.length > 0 && <button className="btn btn-ghost btn-sm" onClick={clearHistory}>LIMPIAR</button>}
        </div>
        {history.length === 0 ? (
          <div className="pricing-empty-history">Sin cotizaciones guardadas todavia.</div>
        ) : (
          <div className="pricing-history-list">
            {history.slice(0, 8).map(entry => (
              <div key={entry.id} className="pricing-history-row">
                <span>{new Date(entry.createdAt).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' })}</span>
                <strong>{entry.input.productId.toUpperCase()} T{entry.input.size}</strong>
                <span>{entry.input.quantity} u.</span>
                <span>{fmt(entry.finalUnitPrice)}</span>
                <span>{fmt(entry.totalProfit)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
