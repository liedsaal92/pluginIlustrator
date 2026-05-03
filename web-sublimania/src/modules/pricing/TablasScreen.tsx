import { useState } from 'react';
import { usePricingStore } from '../../store/usePricingStore';
import type { BasePriceField, CustomerSegment } from '../../pricing/types';

interface Props {
  onToast: (msg: string, type: 'ok' | 'error') => void;
}

function toNum(v: string) { const n = Number(v); return Number.isFinite(n) ? n : 0; }

export function TablasScreen({ onToast: _onToast }: Props) {
  const [segment, setSegment] = useState<CustomerSegment>('normal');
  const { basePrices, updateBasePrice } = usePricingStore();

  const rows = basePrices.filter(r => r.segment === segment);

  function handleChange(size: number, field: BasePriceField, value: string) {
    updateBasePrice(segment, size, field, toNum(value));
  }

  return (
    <div className="screen pricing-screen">
      <div className="pricing-header">
        <div>
          <h1 className="pricing-title">TABLAS DE PRECIOS</h1>
          <div className="pricing-subtitle">// Precios base por talla y segmento de cliente</div>
        </div>
      </div>

      <section className="pricing-panel" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div className="pricing-panel-title" style={{ margin: 0 }}>SEGMENTO</div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {(['normal', 'vip'] as CustomerSegment[]).map(s => (
              <button key={s}
                className={`pricing-transfer-btn${segment === s ? ' active' : ''}`}
                style={{ minWidth: '80px' }}
                onClick={() => setSegment(s)}>
                {s.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="pricing-table-sub" style={{ marginBottom: '0.75rem' }}>
          Editando tabla <strong>{segment.toUpperCase()}</strong>. Los precios se usan como base en el cotizador — el motor aplica restricciones de margen sobre estos valores.
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
              {rows.map(row => (
                <tr key={row.size}>
                  <td>{row.size}</td>
                  {(['camiseta', 'pantaloneta', 'equipo'] as BasePriceField[]).map(field => (
                    <td key={field}>
                      <input className="pricing-price-input" type="number" min="0" step="0.01"
                        value={row[field]}
                        onChange={e => handleChange(row.size, field, e.target.value)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
