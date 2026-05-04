import { useEffect, useState } from 'react';
import { calculateQuote } from '../../pricing/engines/pricingEngine';
import { usePricingStore } from '../../store/usePricingStore';
import { useClientesStore } from '../../store/useClientesStore';
import { useTiposClienteStore } from '../../store/useTiposClienteStore';
import { useTallasStore } from '../../store/useTallasStore';
import { MOLDE_DEFAULT_ID } from '../../store/useMoldesStore';
import { ConfirmButton } from '../../components/ui/ConfirmButton';
import type {
  CustomerSegment, Gender, QuoteInput,
  TablaExportEntry, TablaExportRow,
} from '../../pricing/types';

const PRODUCTS: { id: 'camiseta' | 'pantaloneta' | 'equipo'; label: string }[] = [
  { id: 'camiseta',    label: 'CAMISETA' },
  { id: 'pantaloneta', label: 'PANTALONETA' },
  { id: 'equipo',      label: 'EQUIPO' },
];

const GENDERS: { id: Gender; label: string }[] = [
  { id: 'H', label: '♂ HOMBRES' },
  { id: 'M', label: '♀ MUJERES' },
];

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
function fmt(v: number | undefined) { return v !== undefined ? money.format(v) : '—'; }
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-EC', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

interface Props {
  onToast: (msg: string, type: 'ok' | 'error') => void;
}

// ── HTML standalone para imprimir ──────────────────────────
function generatePrintHtml(entry: TablaExportEntry): string {
  const date = new Date(entry.createdAt).toLocaleDateString('es-EC', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
  const safeName = (entry.clienteNombre ?? 'SinCliente')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '');
  const dateTag = new Date(entry.createdAt)
    .toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' })
    .replace(/\//g, '');
  const modeTag = entry.serviceMode === 'full_service' ? 'Completo' : 'Sublimado';
  const docTitle = `TablaDePreciosPara${safeName}_${modeTag}_${dateTag}`;

  const tableSection = (rows: TablaExportRow[], genderLabel: string) => {
    if (rows.length === 0) return '';
    const bodyRows = rows.map(row =>
      `<tr>
        <td class="sz">${row.size}${row.gender}</td>
        ${PRODUCTS.map(p => `<td>${fmt(row.prices[p.id])}</td>`).join('')}
      </tr>`
    ).join('');
    return `
      <div class="gsec">
        <div class="ghdr">${genderLabel}</div>
        <table>
          <thead><tr><th>TALLA</th>${PRODUCTS.map(p => `<th>${p.label}</th>`).join('')}</tr></thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </div>`;
  };

  const hSection = tableSection(entry.rows.filter(r => r.gender === 'H'), '♂ HOMBRES');
  const mSection = tableSection(entry.rows.filter(r => r.gender === 'M'), '♀ MUJERES');

  const fabricLine = entry.serviceMode === 'full_service'
    ? `<div class="telas">Tela camiseta: <strong>${entry.fabricCamisetaNombre ?? '—'}</strong> · Tela pantaloneta: <strong>${entry.fabricPantalonetaNombre ?? '—'}</strong></div>`
    : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>${docTitle}</title>
<style>
  @page { size: A4 portrait; margin: 0.8cm 1cm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Space Grotesk', Arial, sans-serif; font-size: 8pt; color: #000; background: #fff; }
  .header { display: flex; justify-content: space-between; align-items: flex-start;
            padding: 0.4rem 0.6rem; border: 1px solid #000; }
  .brand { font-size: 11pt; font-weight: 900; letter-spacing: 0.08em; }
  .recipient { font-size: 8pt; margin-top: 0.15rem; opacity: 0.7; }
  .date { font-size: 7pt; margin-top: 0.15rem; opacity: 0.5; }
  .mode-badge { display: inline-block; font-size: 6.5pt; font-weight: 700; letter-spacing: 0.08em;
                padding: 0.1rem 0.4rem; border: 1px solid #000; margin-top: 0.2rem; }
  .telas { font-size: 6.5pt; margin-top: 0.2rem; opacity: 0.6; }
  .gsec { border-left: 1px solid #000; border-right: 1px solid #000; }
  .gsec + .gsec { border-top: 1px solid #000; }
  .ghdr { padding: 0.2rem 0.6rem; font-size: 7pt; font-weight: 700; letter-spacing: 0.1em;
          background: #efefef; border-bottom: 1px solid #ccc; print-color-adjust: exact;
          -webkit-print-color-adjust: exact; }
  table { width: 100%; border-collapse: collapse; border: 1px solid #000; border-top: none; font-size: 8pt; }
  thead tr { background: #222; color: #fff; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  th { padding: 0.25rem 0.5rem; text-align: left; font-size: 7pt; letter-spacing: 0.06em; }
  td { padding: 0.2rem 0.5rem; border-bottom: 0.5px solid #ddd; font-variant-numeric: tabular-nums; }
  .sz { font-weight: 700; }
  tr:last-child td { border-bottom: none; }
  .footer { padding: 0.25rem 0.6rem; font-size: 6.5pt; opacity: 0.4; letter-spacing: 0.04em;
            border: 1px solid #000; border-top: none; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">SUBLIMANIA</div>
      ${entry.clienteNombre ? `<div class="recipient">Para: <strong>${entry.clienteNombre}</strong></div>` : ''}
      <div class="date">${date}</div>
      ${fabricLine}
    </div>
    <div class="mode-badge">${entry.serviceMode === 'full_service' ? 'EQUIPO COMPLETO' : 'SUBLIMADO'}</div>
  </div>
  ${hSection}
  ${mSection}
  <div class="footer">Precios en USD · Sujetos a cambio sin previo aviso</div>
  <script>window.onload = function(){ window.focus(); window.print(); }<\/script>
</body>
</html>`;
}

function openPrintWindow(entry: TablaExportEntry) {
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(generatePrintHtml(entry));
  win.document.close();
}

// ── Tabla en pantalla ──────────────────────────────────────
type LiveRow = TablaExportRow & { costs: Partial<Record<'camiseta' | 'pantaloneta' | 'equipo', number>> };

function LiveTableSection({ rows, showCosto }: { rows: LiveRow[]; showCosto: boolean }) {
  if (rows.length === 0) return null;
  const gender = rows[0].gender;
  const label  = GENDERS.find(g => g.id === gender)!.label;
  return (
    <div className="tabla-cliente-gender-section">
      <div className="tabla-cliente-gender-header">{label}</div>
      <table className="tabla-cliente-table">
        <thead>
          <tr>
            <th>TALLA</th>
            {PRODUCTS.map(p => <th key={p.id}>{p.label}</th>)}
            {showCosto && PRODUCTS.map(p => (
              <th key={`c-${p.id}`} style={{ opacity: 0.5, fontSize: '0.7rem' }}>
                costo {p.label.toLowerCase()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.size}>
              <td className="tabla-cliente-size">{row.size}{row.gender}</td>
              {PRODUCTS.map(p => (
                <td key={p.id} className="tabla-cliente-price">{fmt(row.prices[p.id])}</td>
              ))}
              {showCosto && PRODUCTS.map(p => (
                <td key={`c-${p.id}`} className="tabla-cliente-cost">{fmt(row.costs[p.id])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Historial: fila simplificada ────────────────────────────
function HistoryRow({ entry, onDelete }: { entry: TablaExportEntry; onDelete: () => void }) {
  const isCompleto = entry.serviceMode === 'full_service';
  return (
    <div className="tabla-hist-entry">
      <div className="tabla-hist-summary" style={{ cursor: 'default' }}>
        <div className="tabla-hist-info">
          <span className="tabla-hist-client">{entry.clienteNombre ?? '—'}</span>
          <span className="tabla-hist-date">{fmtDate(entry.createdAt)}</span>
          <span className={`tabla-hist-badge${isCompleto ? ' tabla-hist-badge-completo' : ''}`}>
            {isCompleto ? 'COMPLETO' : 'SUBLIMADO'}
          </span>
          <span className="tabla-hist-badge">{entry.profileName}</span>
          {entry.transferRate > 0 && (
            <span className="tabla-hist-badge tabla-hist-badge-eco">
              ECO {Math.round(entry.transferRate * 100)}%
            </span>
          )}
        </div>
        <div className="tabla-hist-actions">
          <button className="tabla-hist-btn" onClick={() => openPrintWindow(entry)}>
            ↓ DESCARGAR
          </button>
          <ConfirmButton
            className="tabla-hist-btn tabla-hist-btn-del"
            onConfirm={onDelete}
            stopPropagation
          />
        </div>
      </div>
    </div>
  );
}

// ── Hook reutilizable para calcular filas ──────────────────
function useComputeRows(
  segment: CustomerSegment,
  profileId: string,
  serviceMode: 'sublimation' | 'full_service',
  fabricCamisetaId: string | null,
  fabricPantalonetaId: string | null,
  deps: unknown[],
) {
  const {
    config, basePrices, basePricesCompleto, supplies, machines, operations, volumeTiers, printProfiles, fabrics,
    refClienteId, refGender,
  } = usePricingStore();
  const { tallasPorCliente } = useTallasStore();

  const [liveRows, setLiveRows] = useState<LiveRow[]>([]);

  useEffect(() => {
    const rows: LiveRow[] = [];
    for (const { id: gender } of GENDERS) {
      const tallas = basePrices
        .filter(r => r.segment === segment && r.gender === gender)
        .sort((a, b) => a.size - b.size);
      for (const row of tallas) {
        const prices: LiveRow['prices'] = {};
        const costs:  LiveRow['costs']  = {};
        const tallaKey = `${row.size}${gender}`;
        const tallaDims = (refClienteId && refGender)
          ? tallasPorCliente[refClienteId]?.[MOLDE_DEFAULT_ID]?.[tallaKey]
          : undefined;
        for (const { id: productId } of PRODUCTS) {
          try {
            const input: QuoteInput = {
              customerSegment: segment, gender, productId, size: row.size, quantity: 1,
              profileId, profiles: printProfiles,
              basePrices, basePricesCompleto, supplies, machines, operations, volumeTiers,
              savingsTransferRate: 0, config, tallaDims,
              serviceMode, fabrics,
              selectedFabricIdCamiseta: fabricCamisetaId,
              selectedFabricIdPantaloneta: fabricPantalonetaId,
            };
            const q = calculateQuote(input);
            prices[productId] = q.finalUnitPrice;
            costs[productId]  = q.cost.unitCost;
          } catch { /**/ }
        }
        rows.push({ size: row.size, gender, prices, costs });
      }
    }
    setLiveRows(rows);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segment, profileId, serviceMode, fabricCamisetaId, fabricPantalonetaId, basePrices, supplies, machines, operations, volumeTiers, config, refClienteId, refGender, tallasPorCliente, ...deps]);

  return liveRows;
}

// ── Pantalla ────────────────────────────────────────────────
export function TablaClienteScreen({ onToast }: Props) {
  const {
    config, printProfiles, fabrics,
    tablaExports, saveTablaExport, removeTablaExport,
  } = usePricingStore();
  const clientes              = useClientesStore(s => s.clientes);
  const getSegmentoForCliente = useTiposClienteStore(s => s.getSegmentoForCliente);

  const [activeTab, setActiveTab]                 = useState<'sublimado' | 'completo' | 'historial'>('sublimado');
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null);
  const [showCosto, setShowCosto]                 = useState(false);

  // Completo-specific state
  const [fabricCamisetaId, setFabricCamisetaId]         = useState<string | null>(null);
  const [fabricPantalonetaId, setFabricPantalonetaId]   = useState<string | null>(null);

  const profileId         = config.defaultProfileId ?? 'normal';
  const roundingEnabled   = config.roundingEnabled;
  const roundingIncrement = config.roundingIncrement;

  const segment: CustomerSegment = selectedClienteId
    ? getSegmentoForCliente(selectedClienteId)
    : 'normal';

  const transferRate = segment === 'vip'
    ? (config.savingsTransferRateVip ?? 0)
    : (config.savingsTransferRateNormal ?? 0);

  const clienteNombre = clientes.find(c => c.id === selectedClienteId)?.nombre ?? null;
  const profileName   = printProfiles.find(p => p.id === profileId)?.name ?? profileId;

  // Computed rows for each tab
  const liveRowsSublimado = useComputeRows(segment, profileId, 'sublimation', null, null, []);
  const liveRowsCompleto  = useComputeRows(segment, profileId, 'full_service', fabricCamisetaId, fabricPantalonetaId, []);

  const today = new Date().toLocaleDateString('es-EC', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  function handleExportSublimado() {
    const rows: TablaExportRow[] = liveRowsSublimado.map(({ size, gender, prices }) => ({ size, gender, prices }));
    const entry: Omit<TablaExportEntry, 'id' | 'createdAt'> = {
      clienteId: selectedClienteId, clienteNombre, segment,
      profileId, profileName, transferRate,
      roundingEnabled, roundingIncrement,
      rows, serviceMode: 'sublimation',
    };
    saveTablaExport(entry);
    openPrintWindow({ ...entry, id: '', createdAt: new Date().toISOString() });
    onToast('Exportación guardada en historial', 'ok');
  }

  function handleExportCompleto() {
    const fabricC = fabrics.find(f => f.id === fabricCamisetaId);
    const fabricP = fabrics.find(f => f.id === fabricPantalonetaId);
    const rows: TablaExportRow[] = liveRowsCompleto.map(({ size, gender, prices }) => ({ size, gender, prices }));
    const entry: Omit<TablaExportEntry, 'id' | 'createdAt'> = {
      clienteId: selectedClienteId, clienteNombre, segment,
      profileId, profileName, transferRate: 0,
      roundingEnabled, roundingIncrement,
      rows, serviceMode: 'full_service',
      fabricCamisetaNombre: fabricC?.name ?? null,
      fabricPantalonetaNombre: fabricP?.name ?? null,
    };
    saveTablaExport(entry);
    openPrintWindow({ ...entry, id: '', createdAt: new Date().toISOString() });
    onToast('Exportación guardada en historial', 'ok');
  }

  // ── Render ──────────────────────────────────────────────
  const renderClienteSelector = () => (
    <section className="pricing-panel" style={{ padding: '1.25rem', marginTop: '1rem' }}>
      <div className="pricing-form-grid">
        <label className="pricing-field">
          <span>CLIENTE</span>
          <select className="field-input field-select" value={selectedClienteId ?? ''}
            onChange={e => setSelectedClienteId(e.target.value || null)}>
            <option value="">— Sin cliente —</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </label>
      </div>
    </section>
  );

  const renderPrintHeader = (clienteNombreVal: string | null) => (
    <div className="tabla-cliente-print-header">
      <div className="tabla-cliente-brand-block">
        <div className="tabla-cliente-brand">SUBLIMANIA</div>
        {clienteNombreVal
          ? <div className="tabla-cliente-recipient">Para: <strong>{clienteNombreVal}</strong></div>
          : <div className="tabla-cliente-recipient" style={{ opacity: 0.45 }}>Sin cliente</div>
        }
        <div className="tabla-cliente-date">{today}</div>
      </div>
      <label className="pricing-check" style={{ margin: 0 }}>
        <input type="checkbox" checked={showCosto}
          onChange={e => setShowCosto(e.target.checked)} />
        <span>Ver costo/u</span>
      </label>
    </div>
  );

  return (
    <div className="screen pricing-screen">

      {/* ── Header ────────────────────────────────────────────── */}
      <div className="pricing-header">
        <div>
          <h1 className="pricing-title">TABLAS DE PRECIOS</h1>
          <div className="pricing-subtitle">// Listas de precios personalizadas para tu cliente</div>
        </div>
        {(activeTab === 'sublimado' || activeTab === 'completo') && (
          <div className="pricing-header-actions">
            <button className="btn btn-primary btn-sm"
              onClick={activeTab === 'sublimado' ? handleExportSublimado : handleExportCompleto}>
              EXPORTAR PDF
            </button>
          </div>
        )}
      </div>

      {/* ── Tabs ──────────────────────────────────────────────── */}
      <div className="pricing-transfer-btns" style={{ marginTop: '1rem', maxWidth: '480px' }}>
        <button
          className={`pricing-transfer-btn${activeTab === 'sublimado' ? ' active' : ''}`}
          onClick={() => setActiveTab('sublimado')}>
          SUBLIMADO
        </button>
        <button
          className={`pricing-transfer-btn${activeTab === 'completo' ? ' active' : ''}`}
          onClick={() => setActiveTab('completo')}>
          EQUIPO COMPLETO
        </button>
        <button
          className={`pricing-transfer-btn${activeTab === 'historial' ? ' active' : ''}`}
          onClick={() => setActiveTab('historial')}>
          HISTORIAL{tablaExports.length > 0 ? ` (${tablaExports.length})` : ''}
        </button>
      </div>

      {/* ── Tab: SUBLIMADO ────────────────────────────────────── */}
      {activeTab === 'sublimado' && (
        <>
          {renderClienteSelector()}

          <div className="tabla-cliente-info-chips">
            <div className="tabla-cliente-chip">
              <span className="tabla-cliente-chip-label">PERFIL</span>
              <span className="tabla-cliente-chip-value">{profileName}</span>
            </div>
            <div className="tabla-cliente-chip">
              <span className="tabla-cliente-chip-label">SEGMENTO</span>
              <span className="tabla-cliente-chip-value">{segment.toUpperCase()}</span>
            </div>
            <div className="tabla-cliente-chip">
              <span className="tabla-cliente-chip-label">TRASLADO AHORRO</span>
              <span className="tabla-cliente-chip-value">
                {transferRate > 0 ? `${Math.round(transferRate * 100)}%` : '—'}
              </span>
            </div>
            <div className="tabla-cliente-chip">
              <span className="tabla-cliente-chip-label">REDONDEO</span>
              <span className="tabla-cliente-chip-value">
                {roundingEnabled ? `$ ${roundingIncrement.toFixed(2)}` : '—'}
              </span>
            </div>
            <div className="tabla-cliente-chip tabla-cliente-chip-muted">
              Configurar en <strong>COSTOS BASE</strong>
            </div>
          </div>

          <div className="tabla-cliente-printable no-print" style={{ marginTop: '1.5rem' }}>
            {renderPrintHeader(clienteNombre)}
            <LiveTableSection rows={liveRowsSublimado.filter(r => r.gender === 'H')} showCosto={showCosto} />
            <LiveTableSection rows={liveRowsSublimado.filter(r => r.gender === 'M')} showCosto={showCosto} />
            <div className="tabla-cliente-print-footer">
              Precios en USD · Sujetos a cambio sin previo aviso
            </div>
          </div>
        </>
      )}

      {/* ── Tab: EQUIPO COMPLETO ──────────────────────────────── */}
      {activeTab === 'completo' && (
        <>
          {renderClienteSelector()}

          <section className="pricing-panel" style={{ padding: '1.25rem', marginTop: '1rem' }}>
            <div className="pricing-panel-title" style={{ marginBottom: '0.75rem' }}>TELAS</div>
            {fabrics.length === 0 ? (
              <div className="pricing-table-sub" style={{ color: 'var(--red, #f44336)' }}>
                Sin telas configuradas — ir a <strong>COSTOS BASE → TELAS</strong>.
              </div>
            ) : (
              <div className="pricing-form-grid">
                <label className="pricing-field">
                  <span>TELA CAMISETA</span>
                  <select className="field-input field-select" value={fabricCamisetaId ?? ''}
                    onChange={e => setFabricCamisetaId(e.target.value || null)}>
                    <option value="">— Sin tela —</option>
                    {fabrics.map(f => {
                      const eff = f.metersPerKg * (f.tubular ? 2 : 1);
                      const ppm = eff > 0 ? f.costPerKg / eff : 0;
                      return <option key={f.id} value={f.id}>{f.name}{f.tubular ? ' (tubular)' : ''} — ${ppm.toFixed(2)}/m</option>;
                    })}
                  </select>
                </label>
                <label className="pricing-field">
                  <span>TELA PANTALONETA</span>
                  <select className="field-input field-select" value={fabricPantalonetaId ?? ''}
                    onChange={e => setFabricPantalonetaId(e.target.value || null)}>
                    <option value="">— Sin tela —</option>
                    {fabrics.map(f => {
                      const eff = f.metersPerKg * (f.tubular ? 2 : 1);
                      const ppm = eff > 0 ? f.costPerKg / eff : 0;
                      return <option key={f.id} value={f.id}>{f.name}{f.tubular ? ' (tubular)' : ''} — ${ppm.toFixed(2)}/m</option>;
                    })}
                  </select>
                </label>
              </div>
            )}

            <div className="tabla-cliente-info-chips" style={{ marginTop: '0.75rem' }}>
              <div className="tabla-cliente-chip">
                <span className="tabla-cliente-chip-label">PERFIL</span>
                <span className="tabla-cliente-chip-value">{profileName}</span>
              </div>
              <div className="tabla-cliente-chip">
                <span className="tabla-cliente-chip-label">SEGMENTO</span>
                <span className="tabla-cliente-chip-value">{segment.toUpperCase()}</span>
              </div>
              {(config.tailoringCamiseta ?? 0) > 0 && (
                <div className="tabla-cliente-chip">
                  <span className="tabla-cliente-chip-label">COSTURA CAM.</span>
                  <span className="tabla-cliente-chip-value">${(config.tailoringCamiseta ?? 0).toFixed(2)}</span>
                </div>
              )}
              {(config.tailoringPantaloneta ?? 0) > 0 && (
                <div className="tabla-cliente-chip">
                  <span className="tabla-cliente-chip-label">COSTURA PAN.</span>
                  <span className="tabla-cliente-chip-value">${(config.tailoringPantaloneta ?? 0).toFixed(2)}</span>
                </div>
              )}
              {(config.polinesCost ?? 0) > 0 && (
                <div className="tabla-cliente-chip">
                  <span className="tabla-cliente-chip-label">POLINES</span>
                  <span className="tabla-cliente-chip-value">${(config.polinesCost ?? 0).toFixed(2)}</span>
                </div>
              )}
            </div>
          </section>

          <div className="tabla-cliente-printable no-print" style={{ marginTop: '1.5rem' }}>
            {renderPrintHeader(clienteNombre)}
            <LiveTableSection rows={liveRowsCompleto.filter(r => r.gender === 'H')} showCosto={showCosto} />
            <LiveTableSection rows={liveRowsCompleto.filter(r => r.gender === 'M')} showCosto={showCosto} />
            <div className="tabla-cliente-print-footer">
              Precios en USD · Sujetos a cambio sin previo aviso
            </div>
          </div>
        </>
      )}

      {/* ── Tab: HISTORIAL ────────────────────────────────────── */}
      {activeTab === 'historial' && (
        <section className="pricing-panel" style={{ marginTop: '1rem', padding: '1.25rem' }}>
          {tablaExports.length === 0 ? (
            <div className="pricing-table-sub">Sin exportaciones aún. Generá tu primera tabla desde SUBLIMADO o EQUIPO COMPLETO.</div>
          ) : (
            <>
              <div className="pricing-table-sub" style={{ marginBottom: '0.75rem' }}>
                ↓ DESCARGAR abre el PDF con los precios exactos enviados al cliente.
              </div>
              <div className="tabla-hist-list">
                {tablaExports.map(entry => (
                  <HistoryRow
                    key={entry.id}
                    entry={entry}
                    onDelete={() => removeTablaExport(entry.id)}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      )}

    </div>
  );
}
