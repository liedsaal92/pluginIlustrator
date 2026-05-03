import { useMemo, useState } from 'react';
import { printProfiles } from '../../pricing/data/printProfiles';
import { products } from '../../pricing/data/products';
import { sizeMeasurements } from '../../pricing/data/sizeMeasurements';
import { calculateQuote } from '../../pricing/engines/pricingEngine';
import { validateQuoteInput } from '../../pricing/validation';
import { usePricingStore } from '../../store/usePricingStore';
import type { CustomerSegment, PrintProfileId, ProductId, QuoteInput, QuoteResult } from '../../pricing/types';

interface OrderLine {
  id: string;
  productId: ProductId;
  size: number;
  quantity: number;
  linearCm: number;
  manualPrice: string;
}

interface Props {
  onToast: (msg: string, type: 'ok' | 'error') => void;
}

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const pct   = new Intl.NumberFormat('es-EC', { style: 'percent', maximumFractionDigits: 0 });
function fmt(v: number) { return money.format(v); }
function newId()        { return Math.random().toString(36).slice(2, 9); }
function newLine(): OrderLine {
  return { id: newId(), productId: 'camiseta', size: 34, quantity: 1, linearCm: 100, manualPrice: '' };
}

export function CotizadorScreen({ onToast }: Props) {
  const [customerSegment, setCustomerSegment] = useState<CustomerSegment>('normal');
  const [profileId, setProfileId]             = useState<PrintProfileId>('normal');
  const [savingsTransferRate, setSavingsTransferRate] = useState(0);
  const [orderLines, setOrderLines]           = useState<OrderLine[]>([newLine()]);

  const { config, basePrices, supplies, machines, operations, volumeTiers, history, saveQuote, clearHistory } = usePricingStore();

  const lineQuotes = useMemo<(QuoteResult | null)[]>(() =>
    orderLines.map(line => {
      const input: QuoteInput = {
        customerSegment, productId: line.productId, size: line.size,
        quantity: Math.max(1, line.quantity), profileId,
        basePrices, supplies, machines, operations, volumeTiers,
        linearCm: line.linearCm,
        manualPrice: line.manualPrice.trim() ? Number(line.manualPrice) : undefined,
        savingsTransferRate, config,
      };
      try { return calculateQuote(input); } catch { return null; }
    }),
    [orderLines, customerSegment, profileId, basePrices, supplies, machines, operations, savingsTransferRate, config]
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
    printProfiles.map(profile => {
      let tp = 0, tpr = 0;
      for (const line of orderLines) {
        const input: QuoteInput = {
          customerSegment, productId: line.productId, size: line.size,
          quantity: Math.max(1, line.quantity), profileId: profile.id,
          basePrices, supplies, machines, operations, volumeTiers,
          linearCm: line.linearCm,
          manualPrice: line.manualPrice.trim() ? Number(line.manualPrice) : undefined,
          savingsTransferRate, config,
        };
        try { const r = calculateQuote(input); tp += r.totalPrice; tpr += r.totalProfit; } catch { /**/ }
      }
      return { profileId: profile.id, totalPrice: tp, totalProfit: tpr, margin: tp > 0 ? tpr / tp : 0 };
    }),
    [orderLines, customerSegment, basePrices, supplies, machines, operations, savingsTransferRate, config]
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
      const input: QuoteInput = {
        customerSegment, productId: line.productId, size: line.size,
        quantity: Math.max(1, line.quantity), profileId,
        basePrices, supplies, machines, operations, volumeTiers,
        linearCm: line.linearCm,
        manualPrice: line.manualPrice.trim() ? Number(line.manualPrice) : undefined,
        savingsTransferRate, config,
      };
      validateQuoteInput(input).forEach(e => errors.push(`L${i + 1}: ${e}`));
    });
    if (errors.length > 0) { onToast(errors[0], 'error'); return; }
    let saved = 0;
    lineQuotes.forEach(q => { if (q) { saveQuote(q); saved++; } });
    onToast(`${saved} línea(s) guardadas`, 'ok');
  }

  return (
    <div className="screen pricing-screen">
      <div className="pricing-header">
        <div>
          <h1 className="pricing-title">COTIZADOR</h1>
          <div className="pricing-subtitle">// Arma un pedido y obtén precios con márgenes</div>
        </div>
        <div className="pricing-header-actions">
          <button className="btn btn-primary btn-sm" onClick={handleSaveQuote}>GUARDAR COTIZACION</button>
        </div>
      </div>

      <div className="pricing-grid">
        {/* ── Left: form ────────────────────────── */}
        <section className="pricing-panel pricing-form-panel">
          <div className="pricing-panel-title">DATOS DEL PEDIDO</div>
          <div className="pricing-form-grid">
            <label className="pricing-field">
              <span>CLIENTE</span>
              <select className="field-input field-select" value={customerSegment} onChange={e => setCustomerSegment(e.target.value as CustomerSegment)}>
                <option value="normal">NORMAL</option>
                <option value="vip">VIP</option>
              </select>
            </label>
            <label className="pricing-field">
              <span>PERFIL</span>
              <select className="field-input field-select" value={profileId} onChange={e => setProfileId(e.target.value as PrintProfileId)}>
                {printProfiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <div className="pricing-field">
              <span>TRASLADO AHORRO</span>
              <div className="pricing-transfer-btns">
                {[0.20, 0.30, 0.40, 0.50].map(rate => (
                  <button key={rate}
                    className={`pricing-transfer-btn${savingsTransferRate === rate ? ' active' : ''}`}
                    onClick={() => setSavingsTransferRate(savingsTransferRate === rate ? 0 : rate)}>
                    {Math.round(rate * 100)}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pricing-panel-title pricing-panel-title-spaced">LÍNEAS DEL PEDIDO</div>
          <div className="pricing-order-wrap">
            <table className="pricing-order-table">
              <thead>
                <tr><th>PRODUCTO</th><th>TALLA / CM</th><th>CANT.</th><th>P. MANUAL</th><th></th></tr>
              </thead>
              <tbody>
                {orderLines.map(line => (
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
                        <select className="pricing-order-input pricing-order-select" value={line.size}
                          onChange={e => updateLine(line.id, 'size', Number(e.target.value))}>
                          {sizeMeasurements.map(s => <option key={s.size} value={s.size}>{s.size}</option>)}
                        </select>
                      )}
                    </td>
                    <td>
                      <input className="pricing-order-input" type="number" min="1" value={line.quantity}
                        onChange={e => updateLine(line.id, 'quantity', Number(e.target.value))} />
                    </td>
                    <td>
                      <input className="pricing-order-input" type="number" min="0.01" step="0.01" placeholder="—"
                        value={line.manualPrice}
                        onChange={e => updateLine(line.id, 'manualPrice', e.target.value)} />
                    </td>
                    <td>
                      <button className="pricing-order-remove" onClick={() => removeLine(line.id)}>✕</button>
                    </td>
                  </tr>
                ))}
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
                <span>Ahorro perfil ({printProfiles.find(p => p.id === profileId)?.name})</span>
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
                <tr><th>#</th><th>PROD.</th><th>T.</th><th>CANT.</th><th>COSTO/U</th><th>DESC.</th><th>P/U</th><th>SUBTOTAL</th><th>MRG</th></tr>
              </thead>
              <tbody>
                {lineQuotes.map((q, i) => (
                  <tr key={orderLines[i].id} className={q === null ? 'pricing-breakdown-error' : ''}>
                    <td>{i + 1}</td>
                    <td>{orderLines[i].productId.toUpperCase()}</td>
                    <td>{orderLines[i].productId === 'por_cm' ? `${orderLines[i].linearCm}cm` : orderLines[i].size}</td>
                    <td>{orderLines[i].quantity}</td>
                    <td>{q ? fmt(q.cost.unitCost) : '—'}</td>
                    <td className={q && q.volumeDiscount > 0 ? 'pricing-discount-cell' : ''}>
                      {q && q.volumeDiscount > 0 ? `−${Math.round(q.volumeDiscount * 100)}%` : '—'}
                    </td>
                    <td>{q ? fmt(q.finalUnitPrice) : '—'}</td>
                    <td>{q ? fmt(q.totalPrice) : 'ERR'}</td>
                    <td>{q ? pct.format(q.margin) : '—'}</td>
                  </tr>
                ))}
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

      {/* ── Profile comparison ─────────────────────────────────── */}
      <section className="pricing-panel pricing-profile-panel">
        <div className="pricing-panel-title">COMPARACION POR PERFIL — PEDIDO COMPLETO</div>
        <div className="pricing-profile-grid">
          {profileTotals.map(item => (
            <button key={item.profileId}
              className={`pricing-profile-card ${item.profileId === profileId ? 'active' : ''}`}
              onClick={() => setProfileId(item.profileId)}>
              <span>{printProfiles.find(p => p.id === item.profileId)?.name}</span>
              <strong>{fmt(item.totalPrice)}</strong>
              <small>Ganancia {fmt(item.totalProfit)} / Margen {pct.format(item.margin)}</small>
            </button>
          ))}
        </div>
      </section>

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
