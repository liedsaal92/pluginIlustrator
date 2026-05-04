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
  { key: 'equipo',      label: 'EQUIPO'      },
];

const GROUPS: { gender: Gender; label: string; badgeClass: string }[] = [
  { gender: 'H', label: 'HOMBRES', badgeClass: '' },
  { gender: 'M', label: 'MUJERES', badgeClass: 'badge-mujer' },
];

export function TablasScreen({ onToast: _onToast }: Props) {
  const [segment, setSegment] = useState<CustomerSegment>('normal');
  const { basePrices, updateBasePrice } = usePricingStore();

  return (
    <div className="screen pricing-screen">
      <div className="pricing-header">
        <div>
          <h1 className="pricing-title">TABLAS DE PRECIOS</h1>
          <div className="pricing-subtitle">// Precios base por talla, género y segmento de cliente</div>
        </div>
      </div>

      <section className="pricing-panel" style={{ padding: '1.25rem' }}>

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

        {/* Two gender tables stacked, same style as AJUSTES/tallas */}
        <div className="tallas-generos">
          {GROUPS.map(({ gender, label, badgeClass }) => {
            const rows = basePrices.filter(r => r.segment === segment && r.gender === gender);
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
                                onChange={e => updateBasePrice(segment, gender, row.size, f.key, toNum(e.target.value))}
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

      </section>
    </div>
  );
}
