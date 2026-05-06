import { useMemo, useState } from 'react';
import { sizeMeasurements } from '../../pricing/data/sizeMeasurements';
import { calculateQuote } from '../../pricing/engines/pricingEngine';
import { usePricingStore } from '../../store/usePricingStore';
import type { CustomerSegment, Gender, MarketProductId, PrintProfileId, QuoteInput } from '../../pricing/types';

interface Props {
  onToast: (msg: string, type: 'ok' | 'error') => void;
}

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const pct   = new Intl.NumberFormat('es-EC', { style: 'percent', maximumFractionDigits: 0, signDisplay: 'always' });

const PRODUCTS: { id: MarketProductId; label: string }[] = [
  { id: 'camiseta',    label: 'CAMISETA' },
  { id: 'pantaloneta', label: 'PANTALONETA' },
  { id: 'equipo',      label: 'UNIFORME' },
  { id: 'por_cm',      label: 'POR CM (100cm)' },
];

const REF_QUANTITIES = [1, 10, 20, 50];

function positionLabel(myPrice: number, avgComp: number): { label: string; cls: string } {
  if (avgComp <= 0 || myPrice <= 0) return { label: '—', cls: '' };
  const ratio = myPrice / avgComp;
  if (ratio > 1.20) return { label: 'PREMIUM',       cls: 'mkt-pos-premium' };
  if (ratio > 1.05) return { label: 'SOBRE MERCADO', cls: 'mkt-pos-above' };
  if (ratio >= 0.95) return { label: 'A LA PAR',     cls: 'mkt-pos-par' };
  if (ratio >= 0.80) return { label: 'BAJO MERCADO', cls: 'mkt-pos-below' };
  return              { label: 'DESCUENTO',           cls: 'mkt-pos-discount' };
}

export function MercadoScreen({ onToast: _onToast }: Props) {
  const {
    competitors, addCompetitor, updateCompetitor, removeCompetitor,
    basePrices, supplies, machines, operations, volumeTiersByProduct, config, printProfiles,
  } = usePricingStore();
  const enabledProfiles = useMemo(() => printProfiles.filter(p => p.enabled), [printProfiles]);

  const [refSegment, setRefSegment]             = useState<CustomerSegment>('normal');
  const [refGender, setRefGender]               = useState<Gender>('H');
  const [refSize, setRefSize]                   = useState(34);
  const [profileId, setProfileId]               = useState<PrintProfileId>('normal');
  const [savingsTransferRate, setSavingsTransferRate] = useState(0);
  const [refQty, setRefQty]                     = useState(1);

  const myPrices = useMemo<Partial<Record<MarketProductId, number>>>(() => {
    const base: Omit<QuoteInput, 'productId' | 'size' | 'linearCm' | 'volumeTiers'> = {
      customerSegment: refSegment,
      profiles: printProfiles,
      gender: refGender,
      quantity: refQty,
      profileId,
      basePrices,
      supplies,
      machines,
      operations,
      savingsTransferRate,
      config,
    };
    const out: Partial<Record<MarketProductId, number>> = {};
    for (const { id } of PRODUCTS) {
      try {
        const input: QuoteInput = {
          ...base,
          productId: id,
          size: refSize,
          linearCm: 100,
          volumeTiers: volumeTiersByProduct[id] ?? [],
        };
        out[id] = calculateQuote(input).finalUnitPrice;
      } catch { /* skip */ }
    }
    return out;
  }, [refSegment, refSize, refQty, profileId, savingsTransferRate, basePrices, supplies, machines, operations, volumeTiersByProduct, config, printProfiles]);

  return (
    <div className="screen pricing-screen">
      <div className="pricing-header">
        <div>
          <h1 className="pricing-title">MERCADO</h1>
          <div className="pricing-subtitle">// Benchmarking y posición vs competidores</div>
        </div>
      </div>

      {/* ── Competitor editor ──────────────────────────────── */}
      <section className="pricing-panel">
        <div className="pricing-panel-title">COMPETIDORES</div>
        <div className="pricing-table-sub" style={{ marginBottom: '0.75rem' }}>
          Registrá los precios de referencia de cada competidor por tipo de prenda.
        </div>
        <div className="pricing-price-table-wrap">
          <table className="pricing-costs-table">
            <thead>
              <tr>
                <th style={{ minWidth: '160px' }}>NOMBRE</th>
                {PRODUCTS.map(p => <th key={p.id} style={{ minWidth: '100px' }}>{p.label} ($)</th>)}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {competitors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="mkt-empty-row">Sin competidores. Agregá uno debajo.</td>
                </tr>
              ) : competitors.map(c => (
                <tr key={c.id}>
                  <td>
                    <input className="pricing-price-input" type="text" value={c.name}
                      onChange={e => updateCompetitor(c.id, { name: e.target.value })} />
                  </td>
                  {PRODUCTS.map(p => (
                    <td key={p.id}>
                      <input className="pricing-price-input" type="number" min="0" step="0.01"
                        placeholder="—"
                        value={c.prices[p.id] ?? ''}
                        onChange={e => updateCompetitor(c.id, {
                          prices: {
                            ...c.prices,
                            [p.id]: e.target.value === '' ? undefined : Number(e.target.value),
                          },
                        })} />
                    </td>
                  ))}
                  <td>
                    <button className="pricing-order-remove" onClick={() => removeCompetitor(c.id)}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className="pricing-order-add" onClick={addCompetitor}>+ AGREGAR COMPETIDOR</button>
      </section>

      {/* ── Position comparison ────────────────────────────── */}
      {competitors.length > 0 && (
        <section className="pricing-panel" style={{ marginTop: '1.25rem' }}>
          <div className="pricing-panel-title">MI POSICION EN EL MERCADO</div>
          <div className="pricing-table-sub" style={{ marginBottom: '0.9rem' }}>
            Precio calculado con el motor real — perfil, traslado de ahorro y cantidad influyen.
          </div>

          {/* Reference controls */}
          <div className="pricing-form-grid" style={{ marginBottom: '0.75rem' }}>
            <label className="pricing-field">
              <span>SEGMENTO</span>
              <select className="field-input field-select" value={refSegment}
                onChange={e => setRefSegment(e.target.value as CustomerSegment)}>
                <option value="normal">NORMAL</option>
                <option value="vip">VIP</option>
              </select>
            </label>
            <label className="pricing-field">
              <span>GÉNERO</span>
              <select className="field-input field-select" value={refGender}
                onChange={e => setRefGender(e.target.value as Gender)}>
                <option value="H">HOMBRES (H)</option>
                <option value="M">MUJERES (M)</option>
              </select>
            </label>
            <label className="pricing-field">
              <span>TALLA REF.</span>
              <select className="field-input field-select" value={refSize}
                onChange={e => setRefSize(Number(e.target.value))}>
                {sizeMeasurements.map(s => <option key={s.size} value={s.size}>{s.size}{refGender}</option>)}
              </select>
            </label>
            <label className="pricing-field">
              <span>PERFIL</span>
              <select className="field-input field-select" value={profileId}
                onChange={e => setProfileId(e.target.value as PrintProfileId)}>
                {enabledProfiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
          </div>

          <div className="pricing-form-grid" style={{ marginBottom: '1rem' }}>
            <div className="pricing-field">
              <span>CANTIDAD REF.</span>
              <div className="pricing-transfer-btns">
                {REF_QUANTITIES.map(q => (
                  <button key={q}
                    className={`pricing-transfer-btn${refQty === q ? ' active' : ''}`}
                    onClick={() => setRefQty(q)}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
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

          {/* Profile scenario strip */}
          <div className="mkt-profile-strip">
            {enabledProfiles.map(p => {
              const base: Omit<QuoteInput, 'productId' | 'size' | 'linearCm'> = {
                customerSegment: refSegment, gender: refGender, quantity: refQty, profileId: p.id,
                profiles: printProfiles,
                basePrices, supplies, machines, operations,
                volumeTiers: volumeTiersByProduct['camiseta'] ?? [],
                savingsTransferRate, config,
              };
              let price = 0;
              try { price = calculateQuote({ ...base, productId: 'camiseta', size: refSize, linearCm: 100 }).finalUnitPrice; } catch { /* */ }
              const pos = competitors.length > 0 ? (() => {
                const compPrices = competitors.map(c => c.prices.camiseta).filter((v): v is number => v !== undefined && v > 0);
                const avg = compPrices.length > 0 ? compPrices.reduce((s, v) => s + v, 0) / compPrices.length : 0;
                return positionLabel(price, avg);
              })() : { label: '', cls: '' };
              return (
                <button key={p.id}
                  className={`mkt-profile-card ${p.id === profileId ? 'active' : ''}`}
                  onClick={() => setProfileId(p.id)}>
                  <span>{p.name}</span>
                  <strong>{price > 0 ? money.format(price) : '—'}</strong>
                  {pos.label && <small><span className={`mkt-pos-badge ${pos.cls}`}>{pos.label}</span></small>}
                </button>
              );
            })}
          </div>

          {/* Comparison table */}
          <div className="pricing-price-table-wrap" style={{ marginTop: '1rem' }}>
            <table className="pricing-costs-table mkt-comparison-table">
              <thead>
                <tr>
                  <th>PRODUCTO</th>
                  <th>MI PRECIO ({printProfiles.find(p => p.id === profileId)?.name ?? profileId})</th>
                  {competitors.map(c => <th key={c.id}>{c.name.toUpperCase()}</th>)}
                  <th>PROM. COMP.</th>
                  <th>DIFERENCIA</th>
                  <th>POSICION</th>
                </tr>
              </thead>
              <tbody>
                {PRODUCTS.map(({ id: product, label }) => {
                  const myPrice = myPrices[product] ?? 0;
                  const compPrices = competitors
                    .map(c => c.prices[product])
                    .filter((p): p is number => p !== undefined && p > 0);
                  const avgComp = compPrices.length > 0
                    ? compPrices.reduce((s, p) => s + p, 0) / compPrices.length
                    : 0;
                  const diff = avgComp > 0 && myPrice > 0 ? (myPrice - avgComp) / avgComp : null;
                  const pos  = positionLabel(myPrice, avgComp);

                  return (
                    <tr key={product}>
                      <td><strong>{label}</strong></td>
                      <td><strong>{myPrice > 0 ? money.format(myPrice) : '—'}</strong></td>
                      {competitors.map(c => (
                        <td key={c.id}>{c.prices[product] != null ? money.format(c.prices[product]!) : '—'}</td>
                      ))}
                      <td>{avgComp > 0 ? money.format(avgComp) : '—'}</td>
                      <td className={diff !== null ? (diff > 0 ? 'mkt-diff-above' : 'mkt-diff-below') : ''}>
                        {diff !== null ? pct.format(diff) : '—'}
                      </td>
                      <td>{pos.label !== '—' ? <span className={`mkt-pos-badge ${pos.cls}`}>{pos.label}</span> : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mkt-legend">
            <span className="mkt-pos-badge mkt-pos-premium">PREMIUM</span>
            <span className="mkt-legend-sep">&gt;+20%</span>
            <span className="mkt-pos-badge mkt-pos-above">SOBRE MERCADO</span>
            <span className="mkt-legend-sep">+5% a +20%</span>
            <span className="mkt-pos-badge mkt-pos-par">A LA PAR</span>
            <span className="mkt-legend-sep">±5%</span>
            <span className="mkt-pos-badge mkt-pos-below">BAJO MERCADO</span>
            <span className="mkt-legend-sep">−5% a −20%</span>
            <span className="mkt-pos-badge mkt-pos-discount">DESCUENTO</span>
            <span className="mkt-legend-sep">&lt;−20%</span>
          </div>
        </section>
      )}
    </div>
  );
}
