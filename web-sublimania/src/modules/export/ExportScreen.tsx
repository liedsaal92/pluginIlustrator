// ============================================================
//  modules/export/ExportScreen.tsx
// ============================================================
import { useState, useMemo } from 'react';
import { useTeamStore, buildTeamEntryFromWorkingStore } from '../../store/useTeamStore';
import { useTeamsStore } from '../../store/useTeamsStore';
import { useTallasStore } from '../../store/useTallasStore';
import { buildCSV, downloadCSV } from '../../utils/csvExport';
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
  const tallaDims = useTallasStore(s => s.tallas);

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

  return (
    <div className="screen export-screen">
      <div className="export-header">
        <button className="btn btn-ghost" onClick={() => setScreen('configure')}>← VOLVER</button>
        <h2>EXPORTAR CSV</h2>
        <button
          className="btn btn-primary"
          onClick={handleDownload}
          disabled={seleccionadas.size === 0 || !equipo}
          title={!equipo ? 'Completá el nombre del equipo' : seleccionadas.size === 0 ? 'Seleccioná al menos una talla' : ''}
        >
          ⬇ DESCARGAR CSV
        </button>
      </div>

      {!equipo && (
        <div className="export-warning">
          ⚠ El campo <strong>EQUIPO</strong> está vacío. Completalo en la pantalla de configuración antes de exportar.
        </div>
      )}

      <div className="export-body">
        {/* ── Selector de tallas ─────────────────────────── */}
        <div className="export-tallas">
          <div className="export-tallas-title">SELECCIONÁ LAS TALLAS A EXPORTAR</div>
          <div className="export-tallas-grid">
            {todasLasTallas.map(talla => {
              const exportInfo = teamHistory[talla];
              const count = players.filter(p => p.TALLA === talla).length;
              const hasPlayers = count > 0;
              const checked = seleccionadas.has(talla);

              if (!hasPlayers) {
                return (
                  <div key={talla} className="talla-check-card disabled">
                    <div className="talla-check-info">
                      <span className="talla-check-name">{talla}</span>
                      <span className="talla-check-count">Sin jugadores</span>
                    </div>
                  </div>
                );
              }

              return (
                <label
                  key={talla}
                  className={`talla-check-card has-players ${checked ? 'selected' : ''} ${exportInfo ? 'exported' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleTalla(talla)}
                  />
                  <div className="talla-check-info">
                    <span className="talla-check-name">{talla}</span>
                    <span className="talla-check-count">{count} jugador{count !== 1 ? 'es' : ''}</span>
                    {exportInfo && (
                      <span className="talla-check-exported">
                        ✓ Exportado {formatDate(exportInfo.exportedAt)}
                      </span>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* ── Stats ──────────────────────────────────────── */}
        <div className="export-stats">
          <div className="stat-card"><div className="stat-num">{jugadoresFiltrados.length}</div><div className="stat-lbl">JUGADORES</div></div>
          <div className="stat-card"><div className="stat-num">{seleccionadas.size}</div><div className="stat-lbl">TALLAS</div></div>
          <div className="stat-card"><div className="stat-num">{CSV_COLUMN_ORDER.length}</div><div className="stat-lbl">COLUMNAS</div></div>
          <div className="stat-card"><div className="stat-num">{Object.keys(overrides).length}</div><div className="stat-lbl">OVERRIDES</div></div>
        </div>

        {/* ── Preview ────────────────────────────────────── */}
        <div className="export-preview">
          <div className="preview-label">
            PREVIEW {seleccionadas.size > 0 ? `(${tallasSeleccionadasArr.join(', ')})` : '— seleccioná tallas para ver datos'}
          </div>
          <div className="preview-scroll">
            <pre className="preview-csv">{seleccionadas.size > 0 ? preview : ''}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
