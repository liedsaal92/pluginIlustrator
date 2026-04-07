// ============================================================
//  modules/settings/TallasSettingsTab.tsx
//  Tabla CRUD de tallas filtrada por cliente
// ============================================================
import { useState } from 'react';
import { useTallasStore, TALLAS_DEFAULT } from '../../store/useTallasStore';
import { useClientesStore } from '../../store/useClientesStore';
import type { TallaDims } from '../../types';

const FIELDS: { key: keyof TallaDims; label: string }[] = [
  { key: 'ALTO',        label: 'ALTO'        },
  { key: 'ANCHO',       label: 'ANCHO'       },
  { key: 'MANGA_ANCHO', label: 'MANGA ANCHO' },
  { key: 'MANGA_ALTO',  label: 'MANGA ALTO'  },
];

const TALLA_COLORS = ['#E8462A', '#F5C842', '#4A9BE8', '#7B5CF0', '#1DBF73', '#F050A0', '#FF8C00', '#00CED1'];
const colorMap: Record<string, string> = {};
function tallaColor(talla: string): string {
  if (!colorMap[talla]) {
    colorMap[talla] = TALLA_COLORS[Object.keys(colorMap).length % TALLA_COLORS.length];
  }
  return colorMap[talla];
}

export function TallasSettingsTab() {
  const { clientes } = useClientesStore();
  const { getTallas, setDim, addTalla, removeTalla, initClienteFromDefault } = useTallasStore();

  const [clienteId, setClienteId] = useState<string>(clientes[0]?.id ?? '');
  const [newTalla, setNewTalla]   = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  const tallas = clienteId ? getTallas(clienteId) : {};
  const sorted = Object.keys(tallas).sort((a, b) => a.localeCompare(b));

  function handleAdd() {
    const t = newTalla.trim().toUpperCase();
    if (!t || !clienteId) return;
    addTalla(clienteId, t);
    setNewTalla('');
  }

  function handleReset() {
    if (!clienteId) return;
    if (!confirmReset) { setConfirmReset(true); return; }
    initClienteFromDefault(clienteId);
    setConfirmReset(false);
  }

  if (clientes.length === 0) {
    return (
      <div className="tallas-tab">
        <div className="tallas-no-clientes">
          No hay clientes registrados. Creá un cliente en la pestaña <strong>CLIENTES</strong> primero.
        </div>
      </div>
    );
  }

  return (
    <div className="tallas-tab">

      {/* ── Selector de cliente ── */}
      <div className="tallas-cliente-selector">
        <label className="tallas-cliente-label">CLIENTE</label>
        <select
          className="input-player tallas-cliente-select"
          value={clienteId}
          onChange={e => { setClienteId(e.target.value); setConfirmReset(false); }}
        >
          <option value="">— Seleccionar cliente —</option>
          {clientes.map(c => (
            <option key={c.id} value={c.id}>
              {c.nombre}{c.casaCosturera ? ` — ${c.casaCosturera}` : ''}
            </option>
          ))}
        </select>
      </div>

      {clienteId && (
        <>
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
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '16px', color: '#888', fontSize: '12px' }}>
                      Sin tallas — agregá una o usá ↺ RESTABLECER DEFAULTS
                    </td>
                  </tr>
                ) : sorted.map(talla => (
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
                          onChange={e => setDim(clienteId, talla, f.key, e.target.value)}
                        />
                      </td>
                    ))}
                    <td className="col-del">
                      <button
                        className="btn-del-talla"
                        title="Eliminar talla"
                        onClick={() => removeTalla(clienteId, talla)}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="tallas-hint">
            {sorted.length} tallas para <strong>{clientes.find(c => c.id === clienteId)?.nombre}</strong>.
            Los valores se aplican al exportar el CSV según el cliente seleccionado.
          </p>
        </>
      )}
    </div>
  );
}

// También exportamos el valor por defecto de TALLAS_DEFAULT para referencia
export { TALLAS_DEFAULT };
