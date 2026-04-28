// ============================================================
//  modules/export/ExportScreen.tsx
// ============================================================
import { useState, useMemo } from 'react';
import { useTeamStore, buildTeamEntryFromWorkingStore } from '../../store/useTeamStore';
import { useTeamsStore } from '../../store/useTeamsStore';
import { useTallasStore } from '../../store/useTallasStore';
import { useClientesStore } from '../../store/useClientesStore';
import { useMoldesStore } from '../../store/useMoldesStore';
import { buildCSV, downloadCSV } from '../../utils/csvExport';
import { CSV_COLUMN_ORDER, TALLAS_ESTANDAR, buildEmptyRules } from '../../utils/schema';

// Columnas visibles en el preview de tabla
const PREVIEW_COLS = ['NOMBRE', 'NOMBRE_CAMISETA', 'NUMERO', 'TALLA', 'ALTO', 'ANCHO', 'MANGA_ALTO', 'MANGA_ANCHO'];

function parseCSVRow(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === ',' && !inQuotes) { result.push(current); current = ''; continue; }
    current += ch;
  }
  result.push(current);
  return result;
}

interface Props {
  onToast: (msg: string, type: 'ok' | 'error') => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR') + ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2)  return 'ahora';
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'ayer';
  if (days < 30)  return `hace ${days} días`;
  return `hace ${Math.floor(days / 30)} mes${Math.floor(days / 30) > 1 ? 'es' : ''}`;
}

export function ExportScreen({ onToast }: Props) {
  const { players, tallas, tallaRules, overrides, globalConfig } = useTeamStore();
  const { activeTeamId, getActiveTeam, markExported, saveTeam } = useTeamsStore();
  const { getTallas } = useTallasStore();
  const clientes = useClientesStore(s => s.clientes);
  const { moldes } = useMoldesStore();

  const [clienteId, setClienteId] = useState<string>('');
  const [moldeId,   setMoldeId]   = useState<string>(moldes[0]?.id ?? '');
  const [exportConfirm, setExportConfirm] = useState<{
    filename: string; tallas: string[]; jugadores: number; at: string;
  } | null>(null);

  const activeTeam = getActiveTeam();
  const teamHistory = activeTeam?.exportHistory ?? {};

  const equipo = (globalConfig.EQUIPO ?? '').trim();

  // Tallas con jugadores primero, luego las estándar sin jugadores
  const tallasExtras = tallas.filter(t => !TALLAS_ESTANDAR.includes(t));
  const tallasConJugadores = [...tallas, ...tallasExtras.filter(t => !tallas.includes(t))];
  const tallasSinJugadores = [...TALLAS_ESTANDAR, ...tallasExtras].filter(t => !tallasConJugadores.includes(t));
  const todasLasTallas = [...tallasConJugadores, ...tallasSinJugadores];

  void buildEmptyRules; // evitar warning de import no usado

  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());

  function toggleTalla(talla: string) {
    setSeleccionadas(prev => {
      const next = new Set(prev);
      next.has(talla) ? next.delete(talla) : next.add(talla);
      return next;
    });
  }

  const tallasSeleccionadasArr = Array.from(seleccionadas);

  const tallaDims = (clienteId && moldeId) ? getTallas(clienteId, moldeId) : {};

  const csv = useMemo(
    () => buildCSV(players, tallaRules, overrides, globalConfig,
      tallasSeleccionadasArr.length > 0 ? tallasSeleccionadasArr : undefined, tallaDims),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [players, tallaRules, overrides, globalConfig, tallasSeleccionadasArr.join(','), tallaDims]
  );

  const previewCSV = useMemo(
    () => buildCSV(players, tallaRules, overrides, globalConfig,
      tallasSeleccionadasArr.length > 0 ? tallasSeleccionadasArr : [], tallaDims),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [players, tallaRules, overrides, globalConfig, tallasSeleccionadasArr.join(','), tallaDims]
  );

  const jugadoresFiltrados = players.filter(p => seleccionadas.has(p.TALLA ?? ''));

  // Historia de exportaciones
  const historialEntries = tallasConJugadores
    .map(t => ({ talla: t, count: players.filter(p => p.TALLA === t).length, info: teamHistory[t] ?? null }))
    .filter(e => e.count > 0);
  const lastExportTs = Object.values(teamHistory)
    .map(h => new Date(h.exportedAt).getTime())
    .sort((a, b) => b - a)[0] ?? null;

  // Parse preview CSV into table rows
  const { previewHeaders, previewColIndices, previewRows } = useMemo(() => {
    const lines = previewCSV.split('\r\n').filter(Boolean);
    if (lines.length < 1) return { previewHeaders: [], previewColIndices: [], previewRows: [] };
    const allHeaders = parseCSVRow(lines[0]);
    const indices = PREVIEW_COLS.map(col => allHeaders.indexOf(col)).filter(i => i >= 0);
    const headers = indices.map(i => allHeaders[i]);
    const rows = lines.slice(1, 7).map(line => parseCSVRow(line));
    return { previewHeaders: headers, previewColIndices: indices, previewRows: rows };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewCSV]);

  function handleDownload() {
    if (!equipo) {
      onToast('Completá el nombre del equipo antes de exportar.', 'error');
      return;
    }
    if (!clienteId) {
      onToast('Seleccioná un cliente para usar sus tallas.', 'error');
      return;
    }
    if (seleccionadas.size === 0) {
      onToast('Seleccioná al menos una talla para exportar.', 'error');
      return;
    }

    const ts = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const tallasStr = tallasSeleccionadasArr.join('-');
    const filename = `${equipo.replace(/\s+/g, '_').toUpperCase()}_${tallasStr}_${ts}.csv`;
    downloadCSV(csv, filename);

    // Registrar exportación y guardar estado en teamsStore
    if (activeTeamId) {
      markExported(activeTeamId, tallasSeleccionadasArr);
      const partial = buildTeamEntryFromWorkingStore();
      const updatedHistory = {
        ...teamHistory,
        ...Object.fromEntries(tallasSeleccionadasArr.map(t => [t, { exportedAt: new Date().toISOString() }])),
      };
      saveTeam(activeTeamId, { ...partial, exportHistory: updatedHistory });
    }

    onToast('CSV descargado — ' + tallasSeleccionadasArr.join(', '), 'ok');
    setExportConfirm({ filename, tallas: tallasSeleccionadasArr, jugadores: jugadoresFiltrados.length, at: new Date().toISOString() });
    setSeleccionadas(new Set());
  }

  const canDownload = seleccionadas.size > 0 && !!equipo && !!clienteId && !!moldeId;
  const downloadHint = !equipo ? 'Completá el nombre del equipo'
    : !clienteId ? 'Seleccioná un cliente'
    : !moldeId ? 'Seleccioná un molde'
    : seleccionadas.size === 0 ? 'Seleccioná al menos una talla'
    : '';

  return (
    <div className="screen export-screen">
      <div className="export-header">
        <div className="export-title">
          <div className="export-title-main">EXPORTAR CSV</div>
          {equipo && <div className="export-title-team">// {equipo}</div>}
        </div>
      </div>

      {!equipo && (
        <div className="export-warning">
          ⚠ El campo <strong>EQUIPO</strong> está vacío. Completalo en Configuración antes de exportar.
        </div>
      )}

      <div className="export-body">

        {/* ── LEFT: controls ─────────────────────────────── */}
        <div className="export-controls">

          {/* Cliente */}
          <div className="export-section">
            <div className="export-section-label">
              CLIENTE / COSTURERA <span className="export-required">*</span>
            </div>
            {clientes.length === 0 ? (
              <div className="export-no-clientes">
                ⚠ Sin clientes — creá uno en <strong>⚙ Ajustes → Clientes</strong>
              </div>
            ) : (
              <select
                className="export-cliente-select"
                value={clienteId}
                onChange={e => setClienteId(e.target.value)}
              >
                <option value="">— Seleccionar —</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}{c.casaCosturera ? ` — ${c.casaCosturera}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Molde */}
          <div className="export-section">
            <div className="export-section-label">
              TIPO DE MOLDE <span className="export-required">*</span>
            </div>
            {moldes.length === 0 ? (
              <div className="export-no-clientes">
                ⚠ Sin moldes — creá uno en <strong>⚙ Ajustes → Moldes</strong>
              </div>
            ) : (
              <select
                className="export-cliente-select"
                value={moldeId}
                onChange={e => setMoldeId(e.target.value)}
              >
                <option value="">— Seleccionar —</option>
                {moldes.map(m => (
                  <option key={m.id} value={m.id}>{m.nombre}</option>
                ))}
              </select>
            )}
          </div>

          {/* Tallas */}
          <div className="export-section">
            <div className="export-section-label">TALLAS A EXPORTAR</div>
            <div className="talla-toggles-grid">
              {todasLasTallas.map(talla => {
                const exportInfo = teamHistory[talla];
                const count = players.filter(p => p.TALLA === talla).length;
                const hasPlayers = count > 0;
                const selected = seleccionadas.has(talla);
                return (
                  <button
                    key={talla}
                    type="button"
                    className={[
                      'talla-toggle',
                      !hasPlayers ? 'disabled' : '',
                      selected ? 'selected' : '',
                      exportInfo ? 'exported' : '',
                    ].join(' ')}
                    onClick={() => hasPlayers && toggleTalla(talla)}
                    disabled={!hasPlayers}
                    title={!hasPlayers ? 'Sin jugadores en esta talla' : exportInfo ? `Exportado ${formatDate(exportInfo.exportedAt)}` : ''}
                  >
                    <span className="talla-toggle-name">{talla}</span>
                    <span className="talla-toggle-count">
                      {hasPlayers ? `${count} jug.` : 'vacía'}
                    </span>
                    {exportInfo && (
                      <span className="talla-toggle-exported" title={formatDate(exportInfo.exportedAt)}>
                        ✓ {formatRelative(exportInfo.exportedAt)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Historial — debajo de los toggles, contexto para decidir qué exportar */}
          {historialEntries.length > 0 && (
            <div className="export-section">
              <div className="export-historial">
                <div className="export-historial-label">HISTORIAL</div>
                <div className="export-historial-rows">
                  {historialEntries.map(({ talla, count, info }) => (
                    <div key={talla} className={`export-hist-row ${info ? 'hist-exported' : ''}`}>
                      <span className="hist-talla">{talla}</span>
                      <span className="hist-count">{count} jug.</span>
                      {info ? (
                        <span className="hist-date" title={formatDate(info.exportedAt)}>
                          ✓ {formatRelative(info.exportedAt)}
                        </span>
                      ) : (
                        <span className="hist-never">sin exportar</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: output ──────────────────────────────── */}
        <div className="export-output">

          {/* Stat strip */}
          <div className="export-stats-strip">
            <div className="export-stat-pill">
              <span className="export-stat-num">{jugadoresFiltrados.length}</span>
              <span className="export-stat-lbl">JUGADORES</span>
            </div>
            <div className="export-stat-pill">
              <span className="export-stat-num">{seleccionadas.size}</span>
              <span className="export-stat-lbl">TALLAS</span>
            </div>
            <div className="export-stat-pill">
              <span className="export-stat-num">{CSV_COLUMN_ORDER.length}</span>
              <span className="export-stat-lbl">COLUMNAS</span>
            </div>
            <div className="export-stat-pill" title={lastExportTs ? formatDate(new Date(lastExportTs).toISOString()) : ''}>
              <span className="export-stat-num export-stat-num--sm">
                {lastExportTs ? formatRelative(new Date(lastExportTs).toISOString()) : '—'}
              </span>
              <span className="export-stat-lbl">ÚLT. EXPORT</span>
            </div>
          </div>

          {/* Preview */}
          <div className="export-preview">
            <div className="preview-label">
              PREVIEW {seleccionadas.size > 0 ? `· ${jugadoresFiltrados.length} jugadores` : '— seleccioná tallas'}
            </div>

            {/* Talla breakdown */}
            {seleccionadas.size > 0 && (
              <div className="talla-breakdown">
                {tallasSeleccionadasArr.map(talla => {
                  const jug = players.filter(p => p.TALLA === talla);
                  return (
                    <div key={talla} className="tdb-row">
                      <span className="tdb-talla">{talla}</span>
                      <span className="tdb-count">{jug.length} jug.</span>
                      <span className="tdb-names">
                        {jug.map(p => p.NOMBRE_CAMISETA || p.NOMBRE).join(' · ')}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* CSV preview table */}
            <div className="preview-scroll">
              {seleccionadas.size > 0 && previewRows.length > 0 ? (
                <table className="preview-table">
                  <thead>
                    <tr>
                      {previewHeaders.map(h => <th key={h}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, i) => (
                      <tr key={i}>
                        {previewColIndices.map(j => (
                          <td key={j}>{row[j] ?? ''}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="preview-empty">Seleccioná tallas para ver el preview</div>
              )}
            </div>
          </div>

          {/* Export confirm banner */}
          {exportConfirm && (
            <div className="export-confirm-banner">
              <div className="export-confirm-check">✓</div>
              <div className="export-confirm-body">
                <div className="export-confirm-title">EXPORTADO CORRECTAMENTE</div>
                <div className="export-confirm-file">{exportConfirm.filename}</div>
                <div className="export-confirm-meta">
                  {exportConfirm.jugadores} jugadores · {exportConfirm.tallas.join(' · ')}
                </div>
              </div>
              <button className="export-confirm-close" onClick={() => setExportConfirm(null)}>×</button>
            </div>
          )}

          {/* Download CTA */}
          <button
            className="btn-download-cta"
            onClick={handleDownload}
            disabled={!canDownload}
            title={downloadHint}
          >
            <span className="btn-download-cta-main">⬇ DESCARGAR CSV</span>
            {canDownload
              ? <span className="btn-download-cta-sub">{tallasSeleccionadasArr.join(' · ')}</span>
              : <span className="btn-download-cta-sub">{downloadHint}</span>
            }
          </button>
        </div>
      </div>
    </div>
  );
}
