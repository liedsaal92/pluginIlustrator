// ============================================================
//  modules/configure/TallasTab.tsx
//  CRUD global de dimensiones por talla
// ============================================================
import { useState } from 'react';
import { useTallasStore } from '../../store/useTallasStore';
import { ConfirmButton } from '../../components/ui/ConfirmButton';
import type { TallaDims } from '../../types';

const TALLA_COLORS = ['#E8462A', '#F5C842', '#4A9BE8', '#7B5CF0', '#1DBF73', '#F050A0', '#FF8C00', '#00CED1'];
const colorMap: Record<string, string> = {};
function tallaColor(talla: string): string {
  if (!colorMap[talla]) {
    colorMap[talla] = TALLA_COLORS[Object.keys(colorMap).length % TALLA_COLORS.length];
  }
  return colorMap[talla];
}

const FIELDS: { key: keyof TallaDims; label: string }[] = [
  { key: 'ALTO',       label: 'ALTO'         },
  { key: 'ANCHO',      label: 'ANCHO'        },
  { key: 'MANGA_ANCHO', label: 'MANGA ANCHO' },
  { key: 'MANGA_ALTO',  label: 'MANGA ALTO'  },
];

export function TallasTab() {
  const { tallas, setDim, addTalla, removeTalla, resetToDefault } = useTallasStore();
  const [newTalla, setNewTalla] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  const sorted = Object.keys(tallas).sort((a, b) => a.localeCompare(b));

  function handleAdd() {
    const t = newTalla.trim().toUpperCase();
    if (!t) return;
    addTalla(t);
    setNewTalla('');
  }

  function handleReset() {
    if (!confirmReset) { setConfirmReset(true); return; }
    resetToDefault();
    setConfirmReset(false);
  }

  return (
    <div className="tallas-tab">
      <div className="tallas-toolbar">
        <div className="tallas-add">
          <input
            className="input-talla-nueva"
            type="text"
            placeholder="Nueva talla (ej: 46H)"
            value={newTalla}
            maxLength={6}
            onChange={e => setNewTalla(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <button className="btn btn-primary btn-sm" onClick={handleAdd}>
            + AGREGAR
          </button>
        </div>
        <button
          className={`btn btn-sm ${confirmReset ? 'btn-danger' : 'btn-ghost'}`}
          onClick={handleReset}
          onBlur={() => setConfirmReset(false)}
        >
          {confirmReset ? '¿Confirmar reset?' : '↺ RESTABLECER DEFAULTS'}
        </button>
      </div>

      <div className="tallas-table-wrap">
        <table className="tallas-table">
          <thead>
            <tr>
              <th className="col-talla">TALLA</th>
              {FIELDS.map(f => (
                <th key={f.key} className="col-dim">{f.label} <span className="unit">cm</span></th>
              ))}
              <th className="col-del"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(talla => (
              <tr key={talla}>
                <td className="col-talla">
                  <span className="talla-badge" style={{ background: tallaColor(talla) }}>{talla}</span>
                </td>
                {FIELDS.map(f => (
                  <td key={f.key} className="col-dim">
                    <input
                      className="input-dim"
                      type="number"
                      step="0.01"
                      min="0"
                      value={tallas[talla][f.key]}
                      onChange={e => setDim(talla, f.key, e.target.value)}
                    />
                  </td>
                ))}
                <td className="col-del">
                  <ConfirmButton
                    className="btn-del-talla"
                    title="Eliminar talla"
                    onConfirm={() => removeTalla(talla)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="tallas-hint">
        {sorted.length} tallas definidas — estos valores se usan como referencia en el CSV cuando el jugador no tiene dimensiones propias.
      </p>
    </div>
  );
}
