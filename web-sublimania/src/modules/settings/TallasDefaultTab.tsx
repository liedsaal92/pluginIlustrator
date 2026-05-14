// ============================================================
//  modules/settings/TallasDefaultTab.tsx
//  Tallas por defecto de la org, separadas por molde
// ============================================================
import { useState } from 'react';
import { useTallasDefaultStore } from '../../store/useTallasDefaultStore';
import { useMoldesStore } from '../../store/useMoldesStore';
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

interface Props {
  onToast: (msg: string, type: 'ok' | 'error') => void;
}

export function TallasDefaultTab({ onToast }: Props) {
  const { moldes } = useMoldesStore();
  const { loading, getDefaults, getOrden, addDefault, updateDefault, removeDefault, resetToBuiltin } = useTallasDefaultStore();

  const [moldeId,      setMoldeId]      = useState<string>(moldes[0]?.id ?? '');
  const [newTalla,     setNewTalla]     = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  const molde     = moldes.find(m => m.id === moldeId);
  const tipo      = molde?.tipo ?? 'camiseta';
  const isPant    = tipo === 'pantaloneta';

  const FIELDS: { key: keyof TallaDims; label: string }[] = isPant
    ? [
        { key: 'ALTO',  label: 'PANT ALTO'  },
        { key: 'ANCHO', label: 'PANT ANCHO' },
      ]
    : [
        { key: 'ALTO',        label: 'ALTO'        },
        { key: 'ANCHO',       label: 'ANCHO'       },
        { key: 'MANGA_ANCHO', label: 'MANGA ANCHO' },
        { key: 'MANGA_ALTO',  label: 'MANGA ALTO'  },
      ];

  const defaults = moldeId ? getDefaults(moldeId) : {};
  const orden    = moldeId ? getOrden(moldeId)    : [];

  const allKeys = orden.length > 0
    ? orden
    : Object.keys(defaults).sort((a, b) => {
        const numA = parseInt(a), numB = parseInt(b);
        return numA !== numB ? numA - numB : a.localeCompare(b);
      });

  const hombres = allKeys.filter(t => t.toUpperCase().endsWith('H'));
  const mujeres = allKeys.filter(t => t.toUpperCase().endsWith('M'));
  const otros   = allKeys.filter(t => !t.toUpperCase().endsWith('H') && !t.toUpperCase().endsWith('M'));

  function handleAdd() {
    const t = newTalla.trim().toUpperCase();
    if (!t || !moldeId) return;
    if (defaults[t]) { onToast(`La talla "${t}" ya existe`, 'error'); return; }
    addDefault(moldeId, t);
    setNewTalla('');
    onToast(`Talla "${t}" agregada`, 'ok');
  }

  function handleReset() {
    if (!moldeId) return;
    if (!confirmReset) { setConfirmReset(true); return; }
    resetToBuiltin(moldeId, tipo);
    setConfirmReset(false);
    onToast('Tallas restablecidas a valores originales', 'ok');
  }

  function renderGroup(keys: string[], label: string, badgeClass: string) {
    if (keys.length === 0) return null;
    return (
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
                <th className="col-del" />
              </tr>
            </thead>
            <tbody>
              {keys.map(t => (
                <tr key={t}>
                  <td className="col-talla">
                    <span className="talla-badge" style={{ background: tallaColor(t) }}>{t}</span>
                  </td>
                  {FIELDS.map(f => (
                    <td key={f.key} className="col-dim">
                      <input
                        className="input-dim"
                        type="number"
                        step="0.01"
                        min="0"
                        value={defaults[t]?.[f.key] ?? ''}
                        onChange={e => updateDefault(moldeId, t, f.key, e.target.value)}
                      />
                    </td>
                  ))}
                  <td className="col-del">
                    <ConfirmButton
                      className="btn-del-talla"
                      title="Eliminar talla"
                      onConfirm={() => {
                        removeDefault(moldeId, t);
                        onToast(`Talla "${t}" eliminada`, 'ok');
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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

  if (loading) {
    return <div className="tallas-tab"><p className="tallas-hint">Cargando…</p></div>;
  }

  return (
    <div className="tallas-tab">

      <div className="tallas-toolbar">

        <div className="tallas-toolbar-group">
          <span className="tallas-toolbar-label">MOLDE</span>
          <select
            className="tallas-cliente-select"
            value={moldeId}
            onChange={e => { setMoldeId(e.target.value); setConfirmReset(false); setNewTalla(''); }}
          >
            {moldes.map(m => (
              <option key={m.id} value={m.id}>{m.nombre}</option>
            ))}
          </select>
        </div>

        {moldeId && (
          <>
            <div className="tallas-toolbar-sep" />
            <input
              className="input-talla-nueva"
              type="text"
              placeholder="NUEVA TALLA (EJ: 46H)"
              maxLength={6}
              value={newTalla}
              onChange={e => setNewTalla(e.target.value.toUpperCase())}
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
              {confirmReset ? '¿CONFIRMAR RESET?' : '↺ RESTAURAR ORIGINALES'}
            </button>
          </>
        )}

      </div>

      {moldeId && (
        <>
          {allKeys.length === 0 ? (
            <p className="tallas-hint" style={{ textAlign: 'center' }}>
              Sin tallas para <strong>{molde?.nombre}</strong> — agregá una o usá ↺ RESTAURAR ORIGINALES
            </p>
          ) : (
            <div className="tallas-generos">
              {([
                { label: 'HOMBRES', grupo: hombres, badgeClass: 'badge-hombre' },
                { label: 'MUJERES', grupo: mujeres, badgeClass: 'badge-mujer'  },
                ...(otros.length > 0 ? [{ label: 'OTROS', grupo: otros, badgeClass: '' }] : []),
              ] as { label: string; grupo: string[]; badgeClass: string }[])
                .filter(g => g.grupo.length > 0)
                .map(({ label, grupo, badgeClass }) => renderGroup(grupo, label, badgeClass))
              }
            </div>
          )}
          <p className="tallas-hint">
            {allKeys.length} tallas · <strong>{molde?.nombre}</strong>
            {isPant ? ' · pantaloneta' : ' · camiseta'}
          </p>
        </>
      )}
    </div>
  );
}
