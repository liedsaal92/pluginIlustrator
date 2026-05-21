import { usePricingStore } from '../../store/usePricingStore';

function toNum(v: string) { const n = Number(v); return Number.isFinite(n) ? n : 0; }

export function MaquinasTab() {
  const {
    config,
    addPlotter, updatePlotter, removePlotter,
    addPress, updatePress, removePress,
  } = usePricingStore();

  return (
    <div className="settings-tab-content">

      {/* ── Plotters ────────────────────────────────────────── */}
      <section className="pricing-panel pricing-costs-panel">
        <div className="pricing-panel-title">PLOTTERS</div>
        <div className="pricing-table-sub" style={{ marginBottom: '0.75rem' }}>
          Ancho útil de cada plotter. Agrega todos los equipos disponibles;
          seleccionás cuál usar desde Costos Base.
        </div>
        <div className="pricing-price-table-wrap">
          <table className="pricing-costs-table">
            <thead>
              <tr>
                <th>NOMBRE</th>
                <th>ANCHO (cm)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(config.plotters ?? []).length === 0 && (
                <tr><td colSpan={3} className="pricing-empty-row">Sin plotters — agregá uno abajo</td></tr>
              )}
              {(config.plotters ?? []).map(pl => (
                <tr key={pl.id}>
                  <td>
                    <input className="pricing-price-input" type="text" value={pl.name}
                      onChange={e => updatePlotter(pl.id, { name: e.target.value })} />
                  </td>
                  <td>
                    <input className="pricing-price-input" type="number" min="1" step="1" value={pl.widthCm}
                      onChange={e => updatePlotter(pl.id, { widthCm: toNum(e.target.value) })} />
                  </td>
                  <td>
                    <button className="pricing-order-remove" onClick={() => removePlotter(pl.id)}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className="pricing-order-add" onClick={addPlotter}>+ AGREGAR PLOTTER</button>
      </section>

      {/* ── Planchas ────────────────────────────────────────── */}
      <section className="pricing-panel pricing-costs-panel" style={{ marginTop: '1.25rem' }}>
        <div className="pricing-panel-title">PLANCHAS</div>
        <div className="pricing-table-sub" style={{ marginBottom: '0.75rem' }}>
          Dimensiones y costo de cada plancha. El costo se amortiza por bajada (no por metro).
          Papel periódico también se calcula por bajada (en Insumos, ID: <em>newspaper</em>).
        </div>
        <div className="pricing-price-table-wrap">
          <table className="pricing-costs-table">
            <thead>
              <tr>
                <th>NOMBRE</th>
                <th>ANCHO (cm)</th>
                <th>ALTO (cm)</th>
                <th>COSTO ($)</th>
                <th>VIDA (bajadas)</th>
                <th>PAPELES/BAJADA</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(config.presses ?? []).length === 0 && (
                <tr><td colSpan={7} className="pricing-empty-row">Sin planchas — agregá una abajo</td></tr>
              )}
              {(config.presses ?? []).map(pr => (
                <tr key={pr.id}>
                  <td>
                    <input className="pricing-price-input" type="text" value={pr.name}
                      onChange={e => updatePress(pr.id, { name: e.target.value })} />
                  </td>
                  <td>
                    <input className="pricing-price-input" type="number" min="1" step="1" value={pr.widthCm}
                      onChange={e => updatePress(pr.id, { widthCm: toNum(e.target.value) })} />
                  </td>
                  <td>
                    <input className="pricing-price-input" type="number" min="1" step="1" value={pr.heightCm}
                      onChange={e => updatePress(pr.id, { heightCm: toNum(e.target.value) })} />
                  </td>
                  <td>
                    <input className="pricing-price-input" type="number" min="0" step="0.01" value={pr.cost ?? 0}
                      onChange={e => updatePress(pr.id, { cost: toNum(e.target.value) })} />
                  </td>
                  <td>
                    <input className="pricing-price-input" type="number" min="1" step="1000" value={pr.lifeBajadas ?? 100000}
                      onChange={e => updatePress(pr.id, { lifeBajadas: toNum(e.target.value) })} />
                  </td>
                  <td>
                    <input className="pricing-price-input" type="number" min="1" step="1" value={pr.paperSheetsPerBajada ?? 2}
                      onChange={e => updatePress(pr.id, { paperSheetsPerBajada: toNum(e.target.value) })} />
                  </td>
                  <td>
                    <button className="pricing-order-remove" onClick={() => removePress(pr.id)}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className="pricing-order-add" onClick={addPress} style={{ marginTop: '0.75rem' }}>+ AGREGAR PLANCHA</button>
      </section>

    </div>
  );
}
