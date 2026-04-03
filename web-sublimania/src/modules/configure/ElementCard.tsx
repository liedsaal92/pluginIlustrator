// ============================================================
//  modules/configure/ElementCard.tsx — Un elemento del schema
// ============================================================
import type { SchemaElement, Rules } from '../../types';

interface Props {
  el: SchemaElement;
  rules: Rules;
  mode: 'talla' | 'player';
  isOverridden: (key: string) => boolean;
  onChange: (key: string, value: string) => void;
}

export function ElementCard({ el, rules, mode, isOverridden, onChange }: Props) {
  const active = el.toggleKey ? rules[el.toggleKey] === 'SI' : true;

  return (
    <div className={`element-card ${active ? 'element-active' : 'element-inactive'}`}>
      <div className="element-header">
        <span className="element-icon">{el.icon}</span>
        <span className="element-label">{el.label}</span>
        {el.toggleKey ? (
          <label className="toggle-switch">
            <input
              type="checkbox"
              className="el-toggle"
              checked={active}
              onChange={e => onChange(el.toggleKey!, e.target.checked ? 'SI' : 'NO')}
            />
            <span className="toggle-slider" />
          </label>
        ) : (
          <span className="element-always-on">SIEMPRE</span>
        )}
      </div>

      {el.fields.length > 0 && active && (
        <div className="element-fields">
          {el.fields.map(f => {
            const val = rules[f.key] ?? '';
            const overridden = mode === 'player' && isOverridden(f.key);
            return (
              <div key={f.key} className={`field-row ${overridden ? 'is-overridden' : ''}`}>
                <label className="field-label">{f.label.toUpperCase()}</label>
                {f.type === 'select' ? (
                  <select
                    className={`field-select field-input ${overridden ? 'input-overridden' : ''}`}
                    value={val}
                    onChange={e => onChange(f.key, e.target.value)}
                  >
                    <option value="">—</option>
                    {(f.options ?? []).map(o => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className={`field-input ${overridden ? 'input-overridden' : ''}`}
                    value={val}
                    placeholder="0.00"
                    onChange={e => onChange(f.key, e.target.value)}
                  />
                )}
                {f.unit && <span className="field-unit">{f.unit}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
