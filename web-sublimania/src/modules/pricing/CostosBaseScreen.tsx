import { useMemo } from 'react';
import { getCostPerMeter, calcShirtMetersFromDims, calcBajadasDePlancha, calcBajadasFromSizeMeasurement } from '../../pricing/engines/costEngine';
import { usePricingStore } from '../../store/usePricingStore';
import { useClientesStore } from '../../store/useClientesStore';
import { useTallasStore } from '../../store/useTallasStore';
import { useMoldesStore } from '../../store/useMoldesStore';
import { MOLDE_DEFAULT_ID } from '../../store/useMoldesStore';
import { sizeMeasurements } from '../../pricing/data/sizeMeasurements';
import type { Gender } from '../../pricing/types';

interface Props {
  onToast: (msg: string, type: 'ok' | 'error') => void;
}

const dec4 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 4, maximumFractionDigits: 4 });
function fmt4(v: number) { return dec4.format(v); }
function toNum(v: string) { const n = Number(v); return Number.isFinite(n) ? n : 0; }

export function CostosBaseScreen({ onToast }: Props) {
  const {
    config, supplies, machines, operations, volumeTiersByProduct,
    printProfiles, updatePrintProfile, addPrintProfile, removePrintProfile,
    fabrics, updateFabric, addFabric, removeFabric,
    refClienteId, refGender, setRefCliente, setRefGender,
    refClienteIdPant, refGenderPant, refMoldeIdPant, setRefClientePant, setRefGenderPant, setRefMoldePant,
    updateConfig, flushConfig,
    updateSupply, addSupply, removeSupply,
    updateMachine, addMachine, removeMachine,
    updateOperation, addOperation, removeOperation,
    updateVolumeTier, addVolumeTier, removeVolumeTier,
    resetPricingData,
    loading: pricingLoading,
  } = usePricingStore();

  const activePlotter = (config.plotters ?? []).find(p => p.id === config.selectedPlotterId);
  const effectivePlotterWidth = activePlotter?.widthCm ?? config.rollWidthCm;
  const activePress = (config.presses ?? []).find(p => p.id === config.selectedPressId);

  const { clientes } = useClientesStore();
  const { tallasPorCliente } = useTallasStore();
  const { moldes } = useMoldesStore();
  const moldesPant = moldes.filter(m => m.tipo === 'pantaloneta');
  const activeMoldeIdPant = refMoldeIdPant ?? moldesPant[0]?.id ?? null;

  const refTallas = useMemo(() => {
    if (!refClienteId || !refGender) return [];
    const byTalla = tallasPorCliente[refClienteId]?.[MOLDE_DEFAULT_ID] ?? {};
    return Object.entries(byTalla)
      .filter(([nombre]) => nombre.toUpperCase().endsWith(refGender))
      .map(([nombre, dims]) => ({
        nombre,
        meters: calcShirtMetersFromDims(dims, effectivePlotterWidth),
      }))
      .sort((a, b) => parseInt(a.nombre) - parseInt(b.nombre));
  }, [refClienteId, refGender, tallasPorCliente, effectivePlotterWidth]);

  const refTallasPant = useMemo(() => {
    if (!refClienteIdPant || !refGenderPant || !activeMoldeIdPant) return [];
    const byTalla = tallasPorCliente[refClienteIdPant]?.[activeMoldeIdPant] ?? {};
    return Object.entries(byTalla)
      .filter(([nombre]) => nombre.toUpperCase().endsWith(refGenderPant))
      .map(([nombre, dims]) => ({
        nombre,
        meters: calcShirtMetersFromDims(dims, effectivePlotterWidth),
      }))
      .sort((a, b) => parseInt(a.nombre) - parseInt(b.nombre));
  }, [refClienteIdPant, refGenderPant, activeMoldeIdPant, tallasPorCliente, effectivePlotterWidth]);

  const refTallasBajadas = useMemo(() => {
    if (!activePress || !refClienteId || !refGender) return [];
    const byTalla = tallasPorCliente[refClienteId]?.[MOLDE_DEFAULT_ID] ?? {};
    return Object.entries(byTalla)
      .filter(([nombre]) => nombre.toUpperCase().endsWith(refGender))
      .map(([nombre, dims]) => ({ nombre, bajadas: calcBajadasDePlancha(dims, activePress) }))
      .sort((a, b) => parseInt(a.nombre) - parseInt(b.nombre));
  }, [activePress, refClienteId, refGender, tallasPorCliente]);

  const cpmSupplies = useMemo(() => supplies.reduce((s, sup) => {
    if (!sup.quantity || sup.quantity <= 0) return s;
    return s + sup.totalCost / sup.quantity;
  }, 0), [supplies]);

  const cpmMachines = useMemo(() => machines.reduce((s, m) => {
    if (!m.lifeMeters || m.lifeMeters <= 0) return s;
    return s + m.cost / m.lifeMeters;
  }, 0), [machines]);

  const cpmOperations = useMemo(() => {
    const monthly = operations.reduce((s, o) => s + o.monthlyCost, 0);
    return monthly / (config.monthlyMeters > 0 ? config.monthlyMeters : 1);
  }, [operations, config.monthlyMeters]);

  const cpmNormal = useMemo(() => {
    try { return getCostPerMeter('normal', config, supplies, machines, operations, printProfiles); } catch { return 0; }
  }, [config, supplies, machines, operations, printProfiles]);

  return (
    <div className="screen pricing-screen">
      <div className="pricing-header">
        <div>
          <h1 className="pricing-title">COSTOS BASE</h1>
          <div className="pricing-subtitle">// Insumos, maquinaria y operaciones que alimentan el motor de precios</div>
        </div>
        <div className="pricing-header-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => { resetPricingData(); onToast('Datos restablecidos a semilla', 'ok'); }}>
            RESET DATOS
          </button>
        </div>
      </div>

      {/* ── Costo/metro summary ──────────────────────────────── */}
      <section className="pricing-panel">
        <div className="pricing-panel-title">RESUMEN COSTO/METRO</div>
        <div className="pricing-kpis" style={{ marginTop: '0.75rem' }}>
          <div className="pricing-kpi">
            <span>Total (perfil normal)</span>
            <strong>{fmt4(cpmNormal)}</strong>
          </div>
          <div className="pricing-kpi">
            <span>Insumos</span>
            <strong>{fmt4(cpmSupplies)}</strong>
          </div>
          <div className="pricing-kpi">
            <span>Maquinaria</span>
            <strong>{fmt4(cpmMachines)}</strong>
          </div>
          <div className="pricing-kpi">
            <span>Operaciones</span>
            <strong>{fmt4(cpmOperations)}</strong>
          </div>
        </div>
        <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {printProfiles.filter(p => p.id !== 'normal' && p.enabled).map(p => {
            let cpm = 0;
            try { cpm = getCostPerMeter(p.id, config, supplies, machines, operations, printProfiles); } catch { /**/ }
            const saving = cpmNormal - cpm;
            return (
              <div key={p.id} className="pricing-kpi" style={{ flex: '1 1 120px' }}>
                <span>{p.name}</span>
                <strong>{fmt4(cpm)}</strong>
                {saving > 0 && <small style={{ opacity: 0.55, fontSize: '0.68rem' }}>−{fmt4(saving)}/m vs normal</small>}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Insumos ──────────────────────────────────────────── */}
      <section className="pricing-panel pricing-costs-panel" style={{ marginTop: '1.25rem' }}>
        <div className="pricing-panel-title">INSUMOS</div>
        <div className="pricing-table-sub" style={{ marginBottom: '0.75rem' }}>
          Materiales consumidos por metro impreso. "Varía c/tinta" reduce el costo en perfiles ECO.
        </div>
        <div className="pricing-price-table-wrap">
          <table className="pricing-costs-table">
            <thead>
              <tr>
                <th>NOMBRE</th>
                <th>PRECIO LOTE ($)</th>
                <th>METROS EN LOTE</th>
                <th>COSTO/METRO</th>
                <th>VARÍA C/TINTA</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pricingLoading ? <tr><td colSpan={6}><span className="skeleton-row" /></td></tr> : null}
              {!pricingLoading && supplies.length === 0 && (
                <tr><td colSpan={6} className="pricing-empty-row">Sin insumos — agregá uno abajo</td></tr>
              )}
              {supplies.map(s => (
                <tr key={s.id}>
                  <td>
                    <input className="pricing-price-input" type="text" value={s.name}
                      onChange={e => updateSupply(s.id, { name: e.target.value })} />
                  </td>
                  <td>
                    <input className="pricing-price-input" type="number" min="0" step="0.01" value={s.totalCost}
                      onChange={e => updateSupply(s.id, { totalCost: toNum(e.target.value) })} />
                  </td>
                  <td>
                    <input className="pricing-price-input" type="number" min="0.01" step="1" value={s.quantity}
                      onChange={e => updateSupply(s.id, { quantity: toNum(e.target.value) })} />
                  </td>
                  <td className="pricing-costs-derived">
                    {s.quantity > 0 ? fmt4(s.totalCost / s.quantity) : '—'}
                  </td>
                  <td className="pricing-costs-check-cell">
                    <input type="checkbox" checked={s.applyInkFactor}
                      onChange={e => updateSupply(s.id, { applyInkFactor: e.target.checked })} />
                  </td>
                  <td>
                    <button className="pricing-order-remove" onClick={() => removeSupply(s.id)}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className="pricing-order-add" onClick={addSupply}>+ AGREGAR INSUMO</button>
      </section>

      {/* ── Maquinaria ───────────────────────────────────────── */}
      <section className="pricing-panel pricing-costs-panel" style={{ marginTop: '1.25rem' }}>
        <div className="pricing-panel-title">MAQUINARIA</div>
        <div className="pricing-table-sub" style={{ marginBottom: '0.75rem' }}>
          Depreciación distribuida por metros de vida útil estimados.
        </div>
        <div className="pricing-price-table-wrap">
          <table className="pricing-costs-table">
            <thead>
              <tr>
                <th>NOMBRE</th>
                <th>VALOR ($)</th>
                <th>VIDA (METROS)</th>
                <th>DEP./METRO</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pricingLoading ? <tr><td colSpan={5}><span className="skeleton-row" /></td></tr> : null}
              {!pricingLoading && machines.length === 0 && (
                <tr><td colSpan={5} className="pricing-empty-row">Sin equipos — agregá uno abajo</td></tr>
              )}
              {machines.map(m => (
                <tr key={m.id}>
                  <td>
                    <input className="pricing-price-input" type="text" value={m.name}
                      onChange={e => updateMachine(m.id, { name: e.target.value })} />
                  </td>
                  <td>
                    <input className="pricing-price-input" type="number" min="0" step="0.01" value={m.cost}
                      onChange={e => updateMachine(m.id, { cost: toNum(e.target.value) })} />
                  </td>
                  <td>
                    <input className="pricing-price-input" type="number" min="1" step="100" value={m.lifeMeters}
                      onChange={e => updateMachine(m.id, { lifeMeters: toNum(e.target.value) })} />
                  </td>
                  <td className="pricing-costs-derived">
                    {m.lifeMeters > 0 ? fmt4(m.cost / m.lifeMeters) : '—'}
                  </td>
                  <td>
                    <button className="pricing-order-remove" onClick={() => removeMachine(m.id)}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className="pricing-order-add" onClick={addMachine}>+ AGREGAR EQUIPO</button>
      </section>

      {/* ── Equipo activo (plotter + plancha) ────────────────── */}
      <section className="pricing-panel" style={{ marginTop: '1.25rem', padding: '1.25rem' }}>
        <div className="pricing-panel-title">EQUIPO ACTIVO</div>
        <div className="pricing-table-sub" style={{ marginBottom: '1rem' }}>
          Seleccioná el plotter y la plancha en uso. Para agregar o editar máquinas: <strong>Ajustes → Máquinas</strong>.
        </div>

        {/* Plotter */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div className="pricing-table-sub" style={{ marginBottom: '0.5rem' }}>PLOTTER</div>
          {(config.plotters ?? []).length === 0 ? (
            <div className="pricing-table-sub">Sin plotters configurados. Agregá uno en Ajustes → Máquinas.</div>
          ) : (
            <div className="pricing-transfer-btns">
              {(config.plotters ?? []).map(pl => (
                <button key={pl.id}
                  className={`pricing-transfer-btn${config.selectedPlotterId === pl.id ? ' active' : ''}`}
                  onClick={() => updateConfig('selectedPlotterId', pl.id)}>
                  <span className="pricing-transfer-badge">{pl.widthCm} cm</span>
                  {pl.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Plancha */}
        <div>
          <div className="pricing-table-sub" style={{ marginBottom: '0.5rem' }}>PLANCHA</div>
          {(config.presses ?? []).length === 0 ? (
            <div className="pricing-table-sub">Sin planchas configuradas. Agregá una en Ajustes → Máquinas.</div>
          ) : (
            <div className="pricing-transfer-btns">
              {(config.presses ?? []).map(pr => (
                <button key={pr.id}
                  className={`pricing-transfer-btn${config.selectedPressId === pr.id ? ' active' : ''}`}
                  onClick={() => updateConfig('selectedPressId', pr.id)}>
                  <span className="pricing-transfer-badge">{pr.widthCm}×{pr.heightCm} cm</span>
                  {pr.name}
                </button>
              ))}
            </div>
          )}
          {activePress && (
            <div style={{ marginTop: '0.75rem' }}>
              <div className="pricing-table-sub" style={{ marginBottom: '0.4rem' }}>
                Bajadas estimadas — <strong>{activePress.name} ({activePress.widthCm}×{activePress.heightCm} cm)</strong>
              </div>
              <div className="pricing-kpis" style={{ flexWrap: 'wrap', gap: '0.4rem' }}>
                {sizeMeasurements.map(sm => {
                  const bajadas = calcBajadasFromSizeMeasurement(sm, activePress);
                  return (
                    <div key={sm.size} className="pricing-kpi" style={{ flex: '0 0 auto', minWidth: '70px' }}>
                      <span>T{sm.size}</span>
                      <strong>{bajadas} baj.</strong>
                    </div>
                  );
                })}
              </div>
              {refTallasBajadas.length > 0 && (
                <div style={{ marginTop: '0.5rem' }}>
                  <div className="pricing-table-sub" style={{ marginBottom: '0.4rem' }}>Medidas reales del cliente seleccionado:</div>
                  <div className="pricing-kpis" style={{ flexWrap: 'wrap', gap: '0.4rem' }}>
                    {refTallasBajadas.map(t => (
                      <div key={t.nombre} className="pricing-kpi" style={{ flex: '0 0 auto', minWidth: '80px' }}>
                        <span>{t.nombre}</span>
                        <strong>{t.bajadas} baj.</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── Operaciones mensuales ────────────────────────────── */}
      <section className="pricing-panel pricing-costs-panel" style={{ marginTop: '1.25rem' }}>
        <div className="pricing-panel-title">OPERACIONES MENSUALES</div>
        <div className="pricing-table-sub" style={{ marginBottom: '0.75rem' }}>
          Costos fijos mensuales distribuidos entre los metros producidos.
        </div>
        <div className="pricing-price-table-wrap">
          <table className="pricing-costs-table">
            <thead>
              <tr>
                <th>NOMBRE</th>
                <th>COSTO/MES ($)</th>
                <th>COSTO/METRO *</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pricingLoading ? <tr><td colSpan={4}><span className="skeleton-row" /></td></tr> : null}
              {!pricingLoading && operations.length === 0 && (
                <tr><td colSpan={4} className="pricing-empty-row">Sin operaciones — agregá una abajo</td></tr>
              )}
              {operations.map(o => (
                <tr key={o.id}>
                  <td>
                    <input className="pricing-price-input" type="text" value={o.name}
                      onChange={e => updateOperation(o.id, { name: e.target.value })} />
                  </td>
                  <td>
                    <input className="pricing-price-input" type="number" min="0" step="0.01" value={o.monthlyCost}
                      onChange={e => updateOperation(o.id, { monthlyCost: toNum(e.target.value) })} />
                  </td>
                  <td className="pricing-costs-derived">
                    {config.monthlyMeters > 0 ? fmt4(o.monthlyCost / config.monthlyMeters) : '—'}
                  </td>
                  <td>
                    <button className="pricing-order-remove" onClick={() => removeOperation(o.id)}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pricing-costs-ops-note">
          * Con
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <input className="pricing-price-input" style={{ width: '90px', display: 'inline-block' }}
              type="number" min="1" step="100" value={config.monthlyMeters}
              onChange={e => updateConfig('monthlyMeters', toNum(e.target.value))} />
            metros/mes
          </label>
        </div>
        <button className="pricing-order-add" onClick={addOperation}>+ AGREGAR COSTO</button>
      </section>

      {/* ── Reglas de precio ─────────────────────────────────── */}
      <section className="pricing-panel" style={{ marginTop: '1.25rem', padding: '1.25rem' }}>
        <div className="pricing-panel-title">ORGANIZACIÓN</div>
        <div className="pricing-form-grid" style={{ marginBottom: '1.25rem' }}>
          <label className="pricing-field">
            <span>NOMBRE EN COTIZACIONES</span>
            <input className="field-input" type="text" maxLength={60}
              value={config.orgNombre ?? ''}
              onChange={e => updateConfig('orgNombre', e.target.value)}
              placeholder="SUBLIMANIA" />
          </label>
        </div>
      </section>

      <section className="pricing-panel" style={{ marginTop: '1.25rem', padding: '1.25rem' }}>
        <div className="pricing-panel-title">REGLAS DE PRECIO</div>
        <div className="pricing-table-sub" style={{ marginBottom: '0.75rem' }}>
          Restricciones financieras que garantizan rentabilidad mínima en cada cotización.
        </div>
        {/* Volume discount tiers — per product */}
        <div className="pricing-panel-title pricing-panel-title-spaced">DESCUENTOS POR VOLUMEN</div>
        <div className="pricing-table-sub" style={{ marginBottom: '0.75rem' }}>
          Descuento sobre el precio tabla según cantidad por línea. Configurable por producto. Sin tramos = sin descuento.
        </div>
        {([ ['camiseta', 'CAMISETA'], ['pantaloneta', 'PANTALONETA'], ['equipo', 'EQUIPO'], ['por_cm', 'POR CM'] ] as const).map(([pid, label]) => {
          const tiers = volumeTiersByProduct[pid] ?? [];
          return (
            <div key={pid} style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', opacity: 0.55, marginBottom: '0.4rem' }}>
                {label}
              </div>
              {tiers.length === 0 ? (
                <div className="pricing-table-sub" style={{ marginBottom: '0.4rem', opacity: 0.4, fontStyle: 'italic' }}>
                  Sin descuentos por volumen
                </div>
              ) : (
                <div className="pricing-price-table-wrap">
                  <table className="pricing-costs-table">
                    <thead>
                      <tr>
                        <th>DESDE (u)</th>
                        <th>HASTA (u)</th>
                        <th>DESCUENTO %</th>
                        <th>PRECIO TABLA</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {tiers.map(t => (
                        <tr key={t.id}>
                          <td>
                            <input className="pricing-price-input" type="number" min="1" step="1"
                              value={t.from}
                              onChange={e => updateVolumeTier(pid, t.id, { from: Math.max(1, Number(e.target.value)) })} />
                          </td>
                          <td>
                            <input className="pricing-price-input" type="number" min="1" step="1"
                              placeholder="∞"
                              value={t.to ?? ''}
                              onChange={e => updateVolumeTier(pid, t.id, { to: e.target.value === '' ? null : Math.max(1, Number(e.target.value)) })} />
                          </td>
                          <td>
                            <input className="pricing-price-input" type="number" min="0" max="99" step="1"
                              value={Math.round(t.discount * 100)}
                              onChange={e => updateVolumeTier(pid, t.id, { discount: Math.min(0.99, Number(e.target.value) / 100) })} />
                          </td>
                          <td className="pricing-costs-derived">
                            {t.discount === 0 ? 'Precio tabla' : `−${Math.round(t.discount * 100)}%`}
                          </td>
                          <td>
                            <button className="pricing-order-remove" onClick={() => removeVolumeTier(pid, t.id)}>✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <button className="pricing-order-add" onClick={() => addVolumeTier(pid)}>+ AGREGAR TRAMO</button>
            </div>
          );
        })}

        <div className="pricing-panel-title pricing-panel-title-spaced">RESTRICCIONES FINANCIERAS</div>
        <div className="pricing-form-grid">
          <label className="pricing-field">
            <span>MARKUP MÍNIMO %</span>
            <input className="field-input" type="number" min="1" max="95"
              value={Math.round(config.minMargin * 100)}
              onChange={e => updateConfig('minMargin', Number(e.target.value) / 100)} />
          </label>

          <label className="pricing-field">
            <span>PRECIO / CM</span>
            <input className="field-input" type="number" min="0" step="0.01"
              value={config.pricePerCm}
              onChange={e => updateConfig('pricePerCm', Number(e.target.value))} />
          </label>
          <label className="pricing-field">
            <span>ANCHO PLÓTER (CM)</span>
            <input className="field-input" type="number" min="50" max="320" step="1"
              value={config.rollWidthCm}
              onChange={e => updateConfig('rollWidthCm', Number(e.target.value))} />
          </label>
          <label className="pricing-check">
            <input type="checkbox" checked={config.roundingEnabled}
              onChange={e => updateConfig('roundingEnabled', e.target.checked)} />
            <span>REDONDEAR PRECIOS</span>
          </label>
          {config.roundingEnabled && (
            <label className="pricing-field">
              <span>INCREMENTO</span>
              <select className="field-input field-select" value={config.roundingIncrement}
                onChange={e => updateConfig('roundingIncrement', Number(e.target.value))}>
                <option value={0.05}>0.05</option>
                <option value={0.1}>0.10</option>
                <option value={0.25}>0.25</option>
                <option value={0.5}>0.50</option>
              </select>
            </label>
          )}
          <div className="pricing-field" style={{ gridColumn: '1 / -1' }}>
            <span>TRASLADO AHORRO ECO — CLIENTE NORMAL</span>
            <div className="pricing-transfer-btns">
              {([0, 0.20, 0.30, 0.40, 0.50, 0.60, 0.70, 0.80, 0.90, 1.0] as number[]).map(rate => (
                <button key={rate}
                  className={`pricing-transfer-btn${(config.savingsTransferRateNormal ?? 0) === rate ? ' active' : ''}`}
                  onClick={() => updateConfig('savingsTransferRateNormal', rate)}>
                  {rate === 0 ? '—  Sin traslado' : `${Math.round(rate * 100)}%`}
                </button>
              ))}
            </div>
          </div>
          <div className="pricing-field" style={{ gridColumn: '1 / -1' }}>
            <span>TRASLADO AHORRO ECO — CLIENTE VIP</span>
            <div className="pricing-transfer-btns">
              {([0, 0.20, 0.30, 0.40, 0.50, 0.60, 0.70, 0.80, 0.90, 1.0] as number[]).map(rate => (
                <button key={rate}
                  className={`pricing-transfer-btn${(config.savingsTransferRateVip ?? 0) === rate ? ' active' : ''}`}
                  onClick={() => updateConfig('savingsTransferRateVip', rate)}>
                  {rate === 0 ? '—  Sin traslado' : `${Math.round(rate * 100)}%`}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Telas ───────────────────────────────────────────── */}
      <section className="pricing-panel pricing-costs-panel" style={{ marginTop: '1.25rem' }}>
        <div className="pricing-panel-title">TELAS</div>
        <div className="pricing-table-sub" style={{ marginBottom: '0.75rem' }}>
          Telas compradas por kilo. El precio/metro se calcula automáticamente. Usadas en cotizaciones de uniforme completo.
        </div>
        <div className="pricing-price-table-wrap">
          <table className="pricing-costs-table">
            <thead>
              <tr>
                <th>NOMBRE</th>
                <th>$/KG</th>
                <th>METROS/KG</th>
                <th>TUBULAR</th>
                <th>$/METRO EFECTIVO</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {fabrics.map(f => (
                <tr key={f.id}>
                  <td>
                    <input className="pricing-price-input" type="text" value={f.name}
                      onChange={e => updateFabric(f.id, { name: e.target.value })} />
                  </td>
                  <td>
                    <input className="pricing-price-input" type="number" min="0" step="0.01" value={f.costPerKg}
                      onChange={e => updateFabric(f.id, { costPerKg: toNum(e.target.value) })} />
                  </td>
                  <td>
                    <input className="pricing-price-input" type="number" min="0.01" step="0.1" value={f.metersPerKg}
                      onChange={e => updateFabric(f.id, { metersPerKg: Math.max(0.01, toNum(e.target.value)) })} />
                  </td>
                  <td className="pricing-costs-check-cell">
                    <input type="checkbox" checked={f.tubular}
                      onChange={e => updateFabric(f.id, { tubular: e.target.checked })} />
                  </td>
                  <td className="pricing-costs-derived">
                    {(() => {
                      const eff = f.metersPerKg * (f.tubular ? 2 : 1);
                      return eff > 0 ? fmt4(f.costPerKg / eff) : '—';
                    })()}
                    {f.tubular && f.metersPerKg > 0 && (
                      <small style={{ opacity: 0.5, display: 'block', fontSize: '0.65rem' }}>
                        {(f.metersPerKg * 2).toFixed(2)} m/kg efectivos
                      </small>
                    )}
                  </td>
                  <td>
                    <button className="pricing-order-remove" onClick={() => removeFabric(f.id)}>✕</button>
                  </td>
                </tr>
              ))}
              {fabrics.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', opacity: 0.45, fontSize: '0.78rem', padding: '0.75rem' }}>
                    Sin telas configuradas — agregá una con el botón de abajo
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <button className="pricing-order-add" onClick={addFabric}>+ AGREGAR TELA</button>
      </section>

      {/* ── Confección ──────────────────────────────────────── */}
      <section className="pricing-panel" style={{ marginTop: '1.25rem', padding: '1.25rem' }}>
        <div className="pricing-panel-title">CONFECCIÓN</div>
        <div className="pricing-table-sub" style={{ marginBottom: '0.75rem' }}>
          Costos fijos por prenda cuando el servicio incluye costura. Solo aplican en cotizaciones de uniforme completo.
        </div>
        <div className="pricing-form-grid">
          <label className="pricing-field">
            <span>COSTURA CAMISETA ($)</span>
            <input className="field-input" type="number" min="0" step="0.01"
              value={config.tailoringCamiseta ?? 0}
              onChange={e => updateConfig('tailoringCamiseta', toNum(e.target.value))}
              onBlur={flushConfig} />
          </label>
          <label className="pricing-field">
            <span>COSTURA PANTALONETA ($)</span>
            <input className="field-input" type="number" min="0" step="0.01"
              value={config.tailoringPantaloneta ?? 0}
              onChange={e => updateConfig('tailoringPantaloneta', toNum(e.target.value))}
              onBlur={flushConfig} />
          </label>
          <label className="pricing-field">
            <span>POLINES / MEDIAS ($)</span>
            <input className="field-input" type="number" min="0" step="0.01"
              value={config.polinesCost ?? 0}
              onChange={e => updateConfig('polinesCost', toNum(e.target.value))}
              onBlur={flushConfig} />
          </label>
          <label className="pricing-field">
            <span>TELA POR DEFECTO — CAMISETA</span>
            {fabrics.length === 0
              ? <span className="pricing-table-sub">Configura telas primero</span>
              : <select className="field-input field-select"
                  value={config.defaultFabricCamisetaId ?? ''}
                  onChange={e => updateConfig('defaultFabricCamisetaId', e.target.value || null)}>
                  <option value="">-- Ninguna --</option>
                  {fabrics.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
            }
          </label>
          <label className="pricing-field">
            <span>TELA POR DEFECTO — PANTALONETA</span>
            {fabrics.length === 0
              ? <span className="pricing-table-sub">Configura telas primero</span>
              : <select className="field-input field-select"
                  value={config.defaultFabricPantalonetaId ?? ''}
                  onChange={e => updateConfig('defaultFabricPantalonetaId', e.target.value || null)}>
                  <option value="">-- Ninguna --</option>
                  {fabrics.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
            }
          </label>
        </div>
      </section>

      {/* ── Perfiles de impresión ───────────────────────────── */}
      <section className="pricing-panel pricing-costs-panel" style={{ marginTop: '1.25rem' }}>
        <div className="pricing-panel-title">PERFILES DE IMPRESIÓN</div>
        <div className="pricing-table-sub" style={{ marginBottom: '0.75rem' }}>
          Cada perfil define un factor de tinta que reduce el costo en insumos marcados con "Varía c/tinta".
          Habilitá o deshabilitá perfiles para controlar cuáles aparecen en el cotizador.
        </div>
        <div className="pricing-price-table-wrap">
          <table className="pricing-costs-table">
            <thead>
              <tr>
                <th>NOMBRE</th>
                <th>FACTOR TINTA</th>
                <th>AHORRO VS NORMAL</th>
                <th>COSTO/METRO</th>
                <th>PREDETERMINADO</th>
                <th>HABILITADO</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {printProfiles.map(p => {
                let cpm = 0;
                try { cpm = getCostPerMeter(p.id, config, supplies, machines, operations, printProfiles); } catch { /**/ }
                const saving = p.inkFactor < 1 ? Math.round((1 - p.inkFactor) * 100) : 0;
                return (
                  <tr key={p.id} style={{ opacity: p.enabled ? 1 : 0.45 }}>
                    <td>
                      <input className="pricing-price-input" type="text" value={p.name}
                        onChange={e => updatePrintProfile(p.id, { name: e.target.value })} />
                    </td>
                    <td>
                      <input className="pricing-price-input" type="number" min="0.01" max="2" step="0.01"
                        value={p.inkFactor}
                        onChange={e => updatePrintProfile(p.id, { inkFactor: Math.max(0.01, toNum(e.target.value)) })} />
                    </td>
                    <td className="pricing-costs-derived">
                      {saving > 0 ? `−${saving}% tinta` : '—'}
                    </td>
                    <td className="pricing-costs-derived">
                      {cpm > 0 ? fmt4(cpm) : '—'}
                    </td>
                    <td className="pricing-costs-check-cell">
                      <input type="radio" name="defaultProfile"
                        checked={(config.defaultProfileId ?? 'normal') === p.id}
                        onChange={() => updateConfig('defaultProfileId', p.id)} />
                    </td>
                    <td className="pricing-costs-check-cell">
                      <input type="checkbox" checked={p.enabled}
                        onChange={e => updatePrintProfile(p.id, { enabled: e.target.checked })} />
                    </td>
                    <td>
                      <button className="pricing-order-remove" onClick={() => removePrintProfile(p.id)}>✕</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <button className="pricing-order-add" onClick={addPrintProfile}>+ AGREGAR PERFIL</button>
      </section>

      {/* ── Tallas de referencia ─────────────────────────────── */}
      <section className="pricing-panel" style={{ marginTop: '1.25rem', padding: '1.25rem' }}>
        <div className="pricing-panel-title">TALLAS DE REFERENCIA</div>
        <div className="pricing-table-sub" style={{ marginBottom: '0.75rem' }}>
          Seleccioná un cliente y género para que el motor use las medidas reales de tus
          tallas configuradas en lugar de la tabla por defecto.
        </div>

        {/* ── Camiseta ── */}
        <div className="pricing-table-sub" style={{ fontWeight: 600, marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
          CAMISETA
        </div>
        <div className="pricing-form-grid">
          <label className="pricing-field">
            <span>CLIENTE REF.</span>
            <select className="field-input field-select" value={refClienteId ?? ''}
              onChange={e => { setRefCliente(e.target.value || null); }}>
              <option value="">— Usar tabla por defecto —</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </label>
          <div className="pricing-field">
            <span>GÉNERO</span>
            <div className="pricing-transfer-btns">
              {(['H', 'M'] as Gender[]).map(g => (
                <button key={g}
                  className={`pricing-transfer-btn${refGender === g ? ' active' : ''}`}
                  onClick={() => setRefGender(refGender === g ? null : g)}>
                  {g === 'H' ? '♂ H' : '♀ M'}
                </button>
              ))}
            </div>
          </div>
        </div>
        {refClienteId && refGender && refTallas.length > 0 && (
          <div className="ref-tallas-grid">
            {refTallas.map(({ nombre, meters }) => (
              <div key={nombre} className="ref-talla-chip">
                <strong>{nombre}</strong>
                <span>{meters.toFixed(3)} m</span>
              </div>
            ))}
          </div>
        )}
        {refClienteId && refGender && refTallas.length === 0 && (
          <div className="pricing-table-sub" style={{ marginTop: '0.5rem', color: 'var(--red)' }}>
            Sin tallas {refGender} configuradas para este cliente en el molde de camiseta.
          </div>
        )}
        {!refClienteId && (
          <div className="pricing-table-sub" style={{ marginTop: '0.5rem', opacity: 0.55 }}>
            Sin referencia activa — el cotizador usará la tabla hardcodeada de medidas.
          </div>
        )}

        {/* ── Pantaloneta ── */}
        <div className="pricing-table-sub" style={{ fontWeight: 600, margin: '1rem 0 0.5rem', letterSpacing: '0.05em' }}>
          PANTALONETA
        </div>
        {moldesPant.length === 0 ? (
          <div className="pricing-table-sub" style={{ opacity: 0.55 }}>
            No hay moldes de pantaloneta registrados. Creá uno en Ajustes → MOLDES.
          </div>
        ) : (
          <>
            <div className="pricing-form-grid">
              <label className="pricing-field">
                <span>CLIENTE REF.</span>
                <select className="field-input field-select" value={refClienteIdPant ?? ''}
                  onChange={e => setRefClientePant(e.target.value || null)}>
                  <option value="">— Sin referencia —</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </label>
              {moldesPant.length > 1 && (
                <label className="pricing-field">
                  <span>MOLDE</span>
                  <select className="field-input field-select" value={activeMoldeIdPant ?? ''}
                    onChange={e => setRefMoldePant(e.target.value || null)}>
                    {moldesPant.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                  </select>
                </label>
              )}
              <div className="pricing-field">
                <span>GÉNERO</span>
                <div className="pricing-transfer-btns">
                  {(['H', 'M'] as Gender[]).map(g => (
                    <button key={g}
                      className={`pricing-transfer-btn${refGenderPant === g ? ' active' : ''}`}
                      onClick={() => setRefGenderPant(refGenderPant === g ? null : g)}>
                      {g === 'H' ? '♂ H' : '♀ M'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {refClienteIdPant && refGenderPant && refTallasPant.length > 0 && (
              <div className="ref-tallas-grid">
                {refTallasPant.map(({ nombre, meters }) => (
                  <div key={nombre} className="ref-talla-chip">
                    <strong>{nombre}</strong>
                    <span>{meters.toFixed(3)} m</span>
                  </div>
                ))}
              </div>
            )}
            {refClienteIdPant && refGenderPant && refTallasPant.length === 0 && (
              <div className="pricing-table-sub" style={{ marginTop: '0.5rem', color: 'var(--red)' }}>
                Sin tallas {refGenderPant} configuradas para este cliente en el molde seleccionado.
              </div>
            )}
            {!refClienteIdPant && (
              <div className="pricing-table-sub" style={{ marginTop: '0.5rem', opacity: 0.55 }}>
                Sin referencia activa para pantaloneta.
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
