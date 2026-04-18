// ============================================================
//  modules/export/ExportScreen.tsx
// ============================================================
import { useState, useMemo } from 'react';
import { useTeamStore, buildTeamEntryFromWorkingStore } from '../../store/useTeamStore';
import { useTeamsStore } from '../../store/useTeamsStore';
import { useTallasStore } from '../../store/useTallasStore';
import { useClientesStore } from '../../store/useClientesStore';
import { buildCSV, downloadCSV } from '../../utils/csvExport';
import { saveActiveTeam } from '../../store/useTeamsStore';
import { CSV_COLUMN_ORDER, TALLAS_ESTANDAR, buildEmptyRules } from '../../utils/schema';

interface Props {
  onToast: (msg: string, type: 'ok' | 'error') => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR') + ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

export function ExportScreen({ onToast }: Props) {
  const { players, tallas, tallaRules, overrides, globalConfig, setScreen } = useTeamStore();
  const { activeTeamId, getActiveTeam, markExported, saveTeam } = useTeamsStore();
  const { getTallas } = useTallasStore();
  const clientes = useClientesStore(s => s.clientes);

  const [clienteId, setClienteId] = useState<string>('');

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

  const tallaDims = clienteId ? getTallas(clienteId) : {};

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

  const preview = previewCSV.split('\r\n').slice(0, 6).join('\n');
  const jugadoresFiltrados = players.filter(p => seleccionadas.has(p.TALLA ?? ''));

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
    setSeleccionadas(new Set());
  }

  const canDownload = seleccionadas.size > 0 && !!equipo && !!clienteId;
  const downloadHint = !equipo ? 'Completá el nombre del equipo'
    : !clienteId ? 'Seleccioná un cliente'
    : seleccionadas.size === 0 ? 'Seleccioná al menos una talla'
    : '';

  return (
    <div className="screen export-screen">
      <div className="export-header">
        <button className="btn btn-ghost btn-sm" onClick={() => { saveActiveTeam(); setScreen('configure'); }}>← VOLVER</button>
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
                    {exportInfo && <span className="talla-toggle-exported">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
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
            <div className="export-stat-pill">
              <span className="export-stat-num">{Object.keys(overrides).length}</span>
              <span className="export-stat-lbl">OVERRIDES</span>
            </div>
          </div>

          {/* Preview */}
          <div className="export-preview">
            <div className="preview-label">
              PREVIEW {seleccionadas.size > 0 ? `· ${tallasSeleccionadasArr.join(', ')}` : '— seleccioná tallas'}
            </div>
            <div className="preview-scroll">
              <pre className="preview-csv">{seleccionadas.size > 0 ? preview : ''}</pre>
            </div>
          </div>

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
