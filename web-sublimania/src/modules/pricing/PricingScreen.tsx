import { useMemo, useState } from 'react';
import { printProfiles } from '../../pricing/data/printProfiles';
import { products } from '../../pricing/data/products';
import { sizeMeasurements } from '../../pricing/data/sizeMeasurements';
import { calculateQuote } from '../../pricing/engines/pricingEngine';
import { compareProfiles } from '../../pricing/engines/simulator';
import { usePricingStore } from '../../store/usePricingStore';
import type { BasePriceField, CustomerSegment, PrintProfileId, ProductId, QuoteInput } from '../../pricing/types';

interface Props {
  onToast: (msg: string, type: 'ok' | 'error') => void;
}

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const percent = new Intl.NumberFormat('es-EC', { style: 'percent', maximumFractionDigits: 0 });

function formatMoney(value: number): string {
  return money.format(value);
}

function toNumber(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function PricingScreen({ onToast }: Props) {
  const [customerSegment, setCustomerSegment] = useState<CustomerSegment>('normal');
  const [productId, setProductId] = useState<ProductId>('camiseta');
  const [size, setSize] = useState(34);
  const [quantity, setQuantity] = useState(1);
  const [profileId, setProfileId] = useState<PrintProfileId>('normal');
  const [linearCm, setLinearCm] = useState(100);
  const [manualPrice, setManualPrice] = useState('');
  const [savingsTransferRate, setSavingsTransferRate] = useState(0);
  const {
    config,
    basePrices,
    history,
    updateConfig,
    updateBasePrice,
    resetPricingData,
    saveQuote,
    clearHistory,
  } = usePricingStore();

  const input: QuoteInput = {
    customerSegment,
    productId,
    size,
    quantity,
    profileId,
    basePrices,
    linearCm,
    manualPrice: manualPrice.trim() ? Number(manualPrice) : undefined,
    savingsTransferRate,
    config,
  };

  const quote = useMemo(() => calculateQuote(input), [customerSegment, productId, size, quantity, profileId, basePrices, linearCm, manualPrice, savingsTransferRate, config]);
  const profileQuotes = useMemo(() => compareProfiles(input), [customerSegment, productId, size, quantity, basePrices, linearCm, manualPrice, savingsTransferRate, config]);
  const editablePrices = basePrices.filter(row => row.segment === customerSegment);

  function handleSaveQuote() {
    saveQuote(quote);
    onToast('Cotizacion guardada en historial local', 'ok');
  }

  function handleResetPricingData() {
    resetPricingData();
    onToast('Datos de pricing restablecidos desde la semilla del Excel', 'ok');
  }

  function handlePriceChange(segment: CustomerSegment, priceSize: number, field: BasePriceField, value: string) {
    updateBasePrice(segment, priceSize, field, toNumber(value));
  }

  return (
    <div className="screen pricing-screen">
      <div className="pricing-header">
        <div>
          <h1 className="pricing-title">COTIZADOR</h1>
          <div className="pricing-subtitle">// Pricing, margen y ahorro por perfil</div>
        </div>
        <div className="pricing-header-actions">
          <button className="btn btn-ghost btn-sm" onClick={handleResetPricingData}>RESET DATOS</button>
          <button className="btn btn-primary btn-sm" onClick={handleSaveQuote}>GUARDAR COTIZACION</button>
        </div>
      </div>

      <div className="pricing-grid">
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
              <span>PRODUCTO</span>
              <select className="field-input field-select" value={productId} onChange={e => setProductId(e.target.value as ProductId)}>
                {products.map(product => <option key={product.id} value={product.id}>{product.name.toUpperCase()}</option>)}
              </select>
            </label>

            <label className="pricing-field">
              <span>TALLA</span>
              <select className="field-input field-select" value={size} onChange={e => setSize(Number(e.target.value))}>
                {sizeMeasurements.map(item => <option key={item.size} value={item.size}>{item.size}</option>)}
              </select>
            </label>

            <label className="pricing-field">
              <span>CANTIDAD</span>
              <input className="field-input" type="number" min="1" value={quantity} onChange={e => setQuantity(Number(e.target.value))} />
            </label>

            <label className="pricing-field">
              <span>PERFIL</span>
              <select className="field-input field-select" value={profileId} onChange={e => setProfileId(e.target.value as PrintProfileId)}>
                {printProfiles.map(profile => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
              </select>
            </label>

            {productId === 'por_cm' && (
              <label className="pricing-field">
                <span>CM</span>
                <input className="field-input" type="number" min="1" value={linearCm} onChange={e => setLinearCm(Number(e.target.value))} />
              </label>
            )}

            <label className="pricing-field">
              <span>PRECIO MANUAL</span>
              <input className="field-input" type="number" min="0" step="0.01" placeholder="OPCIONAL" value={manualPrice} onChange={e => setManualPrice(e.target.value)} />
            </label>
          </div>

          <div className="pricing-panel-title pricing-panel-title-spaced">REGLAS EDITABLES</div>
          <div className="pricing-form-grid">
            <label className="pricing-field">
              <span>MARGEN MIN.</span>
              <input className="field-input" type="number" min="1" max="95" value={Math.round(config.minMargin * 100)} onChange={e => updateConfig('minMargin', Number(e.target.value) / 100)} />
            </label>
            <label className="pricing-field">
              <span>GANANCIA/COSTO</span>
              <input className="field-input" type="number" min="0" step="0.1" value={config.minProfitRatio} onChange={e => updateConfig('minProfitRatio', Number(e.target.value))} />
            </label>
            <label className="pricing-field">
              <span>TRASLADO AHORRO</span>
              <input className="field-input" type="number" min="0" max="100" value={Math.round(savingsTransferRate * 100)} onChange={e => setSavingsTransferRate(Number(e.target.value) / 100)} />
            </label>
            <label className="pricing-field">
              <span>PRECIO / CM</span>
              <input className="field-input" type="number" min="0" step="0.01" value={config.pricePerCm} onChange={e => updateConfig('pricePerCm', Number(e.target.value))} />
            </label>
            <label className="pricing-check">
              <input type="checkbox" checked={config.roundingEnabled} onChange={e => updateConfig('roundingEnabled', e.target.checked)} />
              <span>REDONDEAR</span>
            </label>
            {config.roundingEnabled && (
              <label className="pricing-field">
                <span>INCREMENTO</span>
                <select className="field-input field-select" value={config.roundingIncrement} onChange={e => updateConfig('roundingIncrement', Number(e.target.value))}>
                  <option value={0.05}>0.05</option>
                  <option value={0.1}>0.10</option>
                  <option value={0.25}>0.25</option>
                  <option value={0.5}>0.50</option>
                </select>
              </label>
            )}
          </div>
        </section>

        <section className="pricing-panel pricing-result-panel">
          <div className="pricing-panel-title">RESULTADO</div>
          <div className="pricing-hero-number">{formatMoney(quote.finalUnitPrice)}</div>
          <div className="pricing-hero-label">PRECIO UNITARIO {manualPrice ? 'MANUAL' : 'RECOMENDADO'}</div>

          <div className="pricing-kpis">
            <div className="pricing-kpi"><span>Costo/u</span><strong>{formatMoney(quote.cost.unitCost)}</strong></div>
            <div className="pricing-kpi"><span>Ganancia/u</span><strong>{formatMoney(quote.unitProfit)}</strong></div>
            <div className="pricing-kpi"><span>Margen</span><strong>{percent.format(quote.margin)}</strong></div>
            <div className="pricing-kpi"><span>Total</span><strong>{formatMoney(quote.totalPrice)}</strong></div>
          </div>

          <div className="pricing-detail-list">
            <div><span>Precio tabla</span><strong>{formatMoney(quote.basePrice)}</strong></div>
            <div><span>Minimo por margen</span><strong>{formatMoney(quote.minPriceByMargin)}</strong></div>
            <div><span>Minimo 1:1</span><strong>{formatMoney(quote.minPriceByProfit)}</strong></div>
            <div><span>Ahorro retenido</span><strong>{formatMoney(quote.retainedSavings)}</strong></div>
            <div><span>Metros/u</span><strong>{quote.cost.metersUnit.toFixed(3)}</strong></div>
          </div>

          <div className="pricing-alerts">
            {quote.alerts.length === 0 ? (
              <div className="pricing-alert pricing-alert-ok">SIN ALERTAS FINANCIERAS</div>
            ) : quote.alerts.map(alert => (
              <div key={alert} className="pricing-alert">{alert}</div>
            ))}
          </div>
        </section>
      </div>

      <section className="pricing-panel pricing-profile-panel">
        <div className="pricing-panel-title">COMPARACION POR PERFIL</div>
        <div className="pricing-profile-grid">
          {profileQuotes.map(item => (
            <button key={item.input.profileId} className={`pricing-profile-card ${item.input.profileId === profileId ? 'active' : ''}`} onClick={() => setProfileId(item.input.profileId)}>
              <span>{printProfiles.find(p => p.id === item.input.profileId)?.name}</span>
              <strong>{formatMoney(item.recommendedUnitPrice)}</strong>
              <small>Costo {formatMoney(item.cost.unitCost)} / Margen {percent.format(item.margin)}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="pricing-panel pricing-table-panel">
        <div className="pricing-table-head">
          <div>
            <div className="pricing-panel-title">TABLA DE PRECIOS EDITABLE</div>
            <div className="pricing-table-sub">Editando cliente {customerSegment.toUpperCase()}. Cambia el selector CLIENTE para editar otra tabla.</div>
          </div>
        </div>
        <div className="pricing-price-table-wrap">
          <table className="pricing-price-table">
            <thead>
              <tr>
                <th>TALLA</th>
                <th>CAMISETA</th>
                <th>PANTALONETA</th>
                <th>EQUIPO</th>
              </tr>
            </thead>
            <tbody>
              {editablePrices.map(row => (
                <tr key={row.size}>
                  <td>{row.size}</td>
                  {(['camiseta', 'pantaloneta', 'equipo'] as BasePriceField[]).map(field => (
                    <td key={field}>
                      <input
                        className="pricing-price-input"
                        type="number"
                        min="0"
                        step="0.01"
                        value={row[field]}
                        onChange={e => handlePriceChange(customerSegment, row.size, field, e.target.value)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

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
                <span>{formatMoney(entry.finalUnitPrice)}</span>
                <span>{formatMoney(entry.totalProfit)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
