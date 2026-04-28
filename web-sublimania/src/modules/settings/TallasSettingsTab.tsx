// ============================================================
//  modules/settings/TallasSettingsTab.tsx
//  Tabla CRUD de tallas filtrada por cliente + molde
// ============================================================
import { useState, useRef } from 'react';
import { useTallasStore, TALLAS_DEFAULT } from '../../store/useTallasStore';
import { useClientesStore } from '../../store/useClientesStore';
import { useMoldesStore } from '../../store/useMoldesStore';
import { ConfirmButton } from '../../components/ui/ConfirmButton';
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

interface Props {
  onToast: (msg: string, type: 'ok' | 'error') => void;
}

export function TallasSettingsTab({ onToast }: Props) {
  const { clientes } = useClientesStore();
  const { moldes } = useMoldesStore();
  const { getTallas, setDim, addTalla, removeTalla, initClienteFromDefault } = useTallasStore();

  const [clienteId, setClienteId] = useState<string>(clientes[0]?.id ?? '');
  const [moldeId,   setMoldeId]   = useState<string>(moldes[0]?.id ?? '');
  const [newTalla, setNewTalla] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [dimSaved, setDimSaved] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function flashSaved() {
    setDimSaved(true);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setDimSaved(false), 1800);
  }

  const tallas = (clienteId && moldeId) ? getTallas(clienteId, moldeId) : {};
  const allKeys = Object.keys(tallas).sort((a, b) => {
    const numA = parseInt(a), numB = parseInt(b);
    return numA !== numB ? numA - numB : a.localeCompare(b);
  });
  const hombres = allKeys.filter(t => t.toUpperCase().endsWith('H'));
  const mujeres = allKeys.filter(t => t.toUpperCase().endsWith('M'));
  const otros = allKeys.filter(t => !t.toUpperCase().endsWith('H') && !t.toUpperCase().endsWith('M'));

  function handleAdd() {
    const t = newTalla.trim().toUpperCase();
    if (!t || !clienteId || !moldeId) return;
    addTalla(clienteId, moldeId, t);
    setNewTalla('');
    onToast(`Talla "${t}" agregada`, 'ok');
  }

  function handleReset() {
    if (!clienteId || !moldeId) return;
    if (!confirmReset) { setConfirmReset(true); return; }
    initClienteFromDefault(clienteId, moldeId);
    setConfirmReset(false);
    onToast('Tallas restablecidas a valores por defecto', 'ok');
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

  if (moldes.length === 0) {
    return (
      <div className="tallas-tab">
        <div className="tallas-no-clientes">
          No hay moldes registrados. Creá un molde en la pestaña <strong>MOLDES</strong> primero.
        </div>
      </div>
    );
  }

  return (
    <div className="tallas-tab">

      {/* ── Barra de controles ── */}
      <div className="tallas-toolbar">

        <div className="tallas-toolbar-group">
          <span className="tallas-toolbar-label">CLIENTE</span>
          <select
            className="tallas-cliente-select"
            value={clienteId}
            onChange={e => { setClienteId(e.target.value); setConfirmReset(false); }}
          >
            <option value="">— Seleccionar —</option>
            {clientes.map(c => (
              <option key={c.id} value={c.id}>
                {c.nombre}{c.casaCosturera ? ` — ${c.casaCosturera}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="tallas-toolbar-sep" />

        <div className="tallas-toolbar-group">
          <span className="tallas-toolbar-label">MOLDE</span>
          <select
            className="tallas-cliente-select"
            value={moldeId}
            onChange={e => { setMoldeId(e.target.value); setConfirmReset(false); }}
          >
            <option value="">— Seleccionar —</option>
            {moldes.map(m => (
              <option key={m.id} value={m.id}>{m.nombre}</option>
            ))}
          </select>
        </div>

        {clienteId && moldeId && (
          <>
            <div className="tallas-toolbar-sep" />
            <input
              className="input-talla-nueva"
              type="text"
              placeholder="NUEVA TALLA (EJ: 46H)"
              value={newTalla}
              maxLength={6}
              onChange={e => setNewTalla(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
            <button className="btn btn-primary btn-sm" onClick={handleAdd}>
              + AGREGAR
            </button>
            <div className="tallas-toolbar-sep" />
            <button
              className={`btn btn-sm ${confirmReset ? 'btn-danger' : 'btn-ghost'}`}
              onClick={handleReset}
              onBlur={() => setConfirmReset(false)}
            >
              {confirmReset ? '¿CONFIRMAR RESET?' : '↺ RESTABLECER DEFAULTS'}
            </button>
            <div className="tallas-toolbar-sep" />
            <span className={`tallas-dim-saved ${dimSaved ? 'visible' : ''}`}>✓ GUARDADO</span>
          </>
        )}

      </div>

      {clienteId && moldeId && (
        <>
          {allKeys.length === 0 ? (
            <p className="tallas-hint" style={{ textAlign: 'center' }}>
              Sin tallas para <strong>{clientes.find(c => c.id === clienteId)?.nombre}</strong> / <strong>{moldes.find(m => m.id === moldeId)?.nombre}</strong> — agregá una o usá ↺ RESTABLECER DEFAULTS
            </p>
          ) : (
            <div className="tallas-generos">
              {([
                { label: 'HOMBRES', grupo: hombres, badgeClass: 'badge-hombre' },
                { label: 'MUJERES', grupo: mujeres, badgeClass: 'badge-mujer' },
                ...(otros.length > 0 ? [{ label: 'OTROS', grupo: otros, badgeClass: '' }] : []),
              ] as { label: string; grupo: string[]; badgeClass: string }[])
                .filter(g => g.grupo.length > 0)
                .map(({ label, grupo, badgeClass }) => (
                  <div key={label} className="tallas-genero-block">
                    <div className={`tallas-genero-title ${badgeClass}`}>{label}</div>
                    <div className="tallas-table-wrap">
                      <table className="tallas-table">
                        <thead>
                          <tr>
                            <th className="col-talla">TALLA</th>
                            {FIELDS.map(f => (
                              <th key={f.key} className="col-dim">
                                {f.label} <span className="unit">cm</span>
                              </th>
                            ))}
                            <th className="col-del"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {grupo.map(talla => (
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
                                    value={tallas[talla][f.key] ?? ''}
                                    onChange={e => { setDim(clienteId, moldeId, talla, f.key, e.target.value); flashSaved(); }}
                                  />
                                </td>
                              ))}
                              <td className="col-del">
                                <ConfirmButton
                                  className="btn-del-talla"
                                  title="Eliminar talla"
                                  onConfirm={() => removeTalla(clienteId, moldeId, talla)}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              }
            </div>
          )}

          <p className="tallas-hint">
            {allKeys.length} tallas · <strong>{clientes.find(c => c.id === clienteId)?.nombre}</strong> · <strong>{moldes.find(m => m.id === moldeId)?.nombre}</strong>
          </p>
        </>
      )}
    </div>
  );
}

export { TALLAS_DEFAULT };
