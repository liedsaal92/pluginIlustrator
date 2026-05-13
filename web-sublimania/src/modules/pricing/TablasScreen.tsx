import { useState } from 'react';
import { usePricingStore } from '../../store/usePricingStore';
import type { BasePriceField, CustomerSegment, Gender } from '../../pricing/types';

interface Props {
  onToast: (msg: string, type: 'ok' | 'error') => void;
}

function toNum(v: string) { const n = Number(v); return Number.isFinite(n) ? n : 0; }

const TALLA_COLORS = ['#E8462A', '#F5C842', '#4A9BE8', '#7B5CF0', '#1DBF73', '#F050A0', '#FF8C00', '#00CED1'];
const colorMap: Record<number, string> = {};
function tallaColor(size: number): string {
  if (!colorMap[size]) {
    colorMap[size] = TALLA_COLORS[Object.keys(colorMap).length % TALLA_COLORS.length];
  }
  return colorMap[size];
}

const FIELDS: { key: BasePriceField; label: string }[] = [
  { key: 'camiseta',    label: 'CAMISETA'    },
  { key: 'pantaloneta', label: 'PANTALONETA' },
  { key: 'equipo',      label: 'UNIFORME'    },
];

const GROUPS: { gender: Gender; label: string; badgeClass: string }[] = [
  { gender: 'H', label: 'HOMBRES', badgeClass: '' },
  { gender: 'M', label: 'MUJERES', badgeClass: 'badge-mujer' },
];

type TabMode = 'sublimado' | 'completo' | 'por_cm' | 'por_papel';

function PriceGrid({
  segment,
  basePrices,
  onUpdate,
}: {
  segment: CustomerSegment;
  basePrices: ReturnType<typeof usePricingStore.getState>['basePrices'];
  onUpdate: (segment: CustomerSegment, gender: Gender, size: number, field: BasePriceField, value: number) => void;
}) {
  return (
    <div className="tallas-generos">
      {GROUPS.map(({ gender, label, badgeClass }) => {
        const rows = basePrices.filter(r => r.segment === segment && r.gender === gender).sort((a, b) => a.size - b.size);
        return (
          <div key={gender} className="tallas-genero-block">
            <div className={`tallas-genero-title ${badgeClass}`}>{label}</div>
            <div className="tallas-table-wrap">
              <table className="pricing-price-table">
                <thead>
                  <tr>
                    <th>TALLA</th>
                    {FIELDS.map(f => <th key={f.key}>{f.label} ($)</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.size}>
                      <td>
                        <span className="talla-badge" style={{ background: tallaColor(row.size) }}>
                          {row.size}{gender}
                        </span>
                      </td>
                      {FIELDS.map(f => (
                        <td key={f.key}>
                          <input
                            className="pricing-price-input"
                            type="number"
                            min="0"
                            step="0.01"
                            value={row[f.key]}
                            onChange={e => onUpdate(segment, gender, row.size, f.key, toNum(e.target.value))}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function TablasScreen({ onToast: _onToast }: Props) {
  const [tab, setTab]         = useState<TabMode>('sublimado');
  const [segment, setSegment] = useState<CustomerSegment>('normal');

  const {
    basePrices, updateBasePrice,
    basePricesCompleto, updateBasePriceCompleto,
    cmPriceTiers, updateCmTier, addCmTier, removeCmTier,
    paperPriceTiers, updatePaperTier, addPaperTier, removePaperTier,
  } = usePricingStore();

  const isCompleto  = tab === 'completo';
  const isPorCm     = tab === 'por_cm';
  const isPorPapel  = tab === 'por_papel';
  const prices      = isCompleto ? basePricesCompleto : basePrices;
  const onUpdate    = isCompleto ? updateBasePriceCompleto : updateBasePrice;

  const sortedTiers      = [...cmPriceTiers].sort((a, b) => a.maxCm - b.maxCm);
  const sortedPaperTiers = [...paperPriceTiers].sort((a, b) => a.maxCm - b.maxCm);

  return (
    <div className="screen pricing-screen">
      <div className="pricing-header">
        <div>
          <h1 className="pricing-title">TABLAS DE PRECIOS BASE</h1>
          <div className="pricing-subtitle">// Precios de lista por talla, género y segmento</div>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────── */}
      <div className="pricing-transfer-btns" style={{ marginTop: '1rem', maxWidth: '520px' }}>
        <button
          className={`pricing-transfer-btn pricing-transfer-btn--own${tab === 'completo' ? ' active' : ''}`}
          onClick={() => setTab('completo')}>
          <span className="pricing-transfer-badge">MIS PRODUCTOS</span>
          UNIFORME COMPLETO
        </button>
        <button
          className={`pricing-transfer-btn${tab === 'sublimado' ? ' active' : ''}`}
          onClick={() => setTab('sublimado')}>
          SUBLIMADO
        </button>
        <button
          className={`pricing-transfer-btn${tab === 'por_cm' ? ' active' : ''}`}
          onClick={() => setTab('por_cm')}>
          POR CM
        </button>
        <button
          className={`pricing-transfer-btn${tab === 'por_papel' ? ' active' : ''}`}
          onClick={() => setTab('por_papel')}>
          POR PAPEL
        </button>
      </div>

      {/* ── Tab: POR CM ─────────────────────────────────────── */}
      {isPorCm ? (
        <section className="pricing-panel pricing-costs-panel" style={{ marginTop: '1rem' }}>
          <div className="pricing-panel-title">PRECIOS POR CM</div>
          <div className="pricing-table-sub" style={{ marginBottom: '0.75rem' }}>
            El cotizador busca el primer rango donde los cm solicitados ≤ HASTA y usa ese precio.
          </div>
          <div className="pricing-price-table-wrap">
            <table className="pricing-costs-table">
              <thead>
                <tr>
                  <th>HASTA (cm)</th>
                  <th>PRECIO ($)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sortedTiers.map(tier => (
                  <tr key={tier.id}>
                    <td>
                      <input
                        className="pricing-price-input"
                        type="number" min="1" step="1"
                        value={tier.maxCm}
                        onChange={e => updateCmTier(tier.id, { maxCm: Math.max(1, toNum(e.target.value)) })}
                      />
                    </td>
                    <td>
                      <input
                        className="pricing-price-input"
                        type="number" min="0" step="0.01"
                        value={tier.price}
                        onChange={e => updateCmTier(tier.id, { price: toNum(e.target.value) })}
                      />
                    </td>
                    <td>
                      <button className="pricing-order-remove" onClick={() => removeCmTier(tier.id)}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="pricing-order-add" onClick={addCmTier}>+ AGREGAR RANGO</button>
        </section>
      ) : isPorPapel ? (
        <section className="pricing-panel pricing-costs-panel" style={{ marginTop: '1rem' }}>
          <div className="pricing-panel-title">PRECIOS POR PAPEL</div>
          <div className="pricing-table-sub" style={{ marginBottom: '0.75rem' }}>
            Precios de venta para impresión en papel sublimado. El cotizador usa estos rangos en modo <strong>SOLO PAPEL</strong>.
          </div>
          <div className="pricing-price-table-wrap">
            <table className="pricing-costs-table">
              <thead>
                <tr>
                  <th>HASTA (cm)</th>
                  <th>PRECIO ($)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sortedPaperTiers.map(tier => (
                  <tr key={tier.id}>
                    <td>
                      <input
                        className="pricing-price-input"
                        type="number" min="1" step="1"
                        value={tier.maxCm}
                        onChange={e => updatePaperTier(tier.id, { maxCm: Math.max(1, toNum(e.target.value)) })}
                      />
                    </td>
                    <td>
                      <input
                        className="pricing-price-input"
                        type="number" min="0" step="0.01"
                        value={tier.price}
                        onChange={e => updatePaperTier(tier.id, { price: toNum(e.target.value) })}
                      />
                    </td>
                    <td>
                      <button className="pricing-order-remove" onClick={() => removePaperTier(tier.id)}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="pricing-order-add" onClick={addPaperTier}>+ AGREGAR RANGO</button>
        </section>
      ) : (
        <section className="pricing-panel" style={{ padding: '1.25rem', marginTop: '1rem' }}>

          {isCompleto && (
            <div className="pricing-table-sub" style={{ marginBottom: '1rem' }}>
              Precios de lista para <strong>uniforme completo</strong> (sublimado + tela + costura + polines).
              El cotizador usa estos precios cuando el modo es <strong>UNIFORME COMPLETO</strong>.
            </div>
          )}

          {/* Segment toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            <div className="pricing-panel-title" style={{ margin: 0 }}>SEGMENTO</div>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {(['normal', 'vip'] as CustomerSegment[]).map(s => (
                <button key={s}
                  className={`pricing-transfer-btn${segment === s ? ' active' : ''}`}
                  style={{ minWidth: '80px' }}
                  onClick={() => setSegment(s)}>
                  {s.toUpperCase()}
                </button>
              ))}
            </div>
            <span className="pricing-table-sub" style={{ margin: 0 }}>
              Editando tabla <strong>{segment.toUpperCase()}</strong> — precios independientes por género.
            </span>
          </div>

          <PriceGrid segment={segment} basePrices={prices} onUpdate={onUpdate} />

        </section>
      )}
    </div>
  );
}
