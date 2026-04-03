// ============================================================
//  modules/export/ExportScreen.tsx
// ============================================================
import { useTeamStore } from '../../store/useTeamStore';
import { buildCSV, downloadCSV } from '../../utils/csvExport';
import { CSV_COLUMN_ORDER } from '../../utils/schema';

interface Props {
  onToast: (msg: string, type: 'ok' | 'error') => void;
}

export function ExportScreen({ onToast }: Props) {
  const { players, tallas, tallaRules, overrides, globalConfig, setScreen } = useTeamStore();

  const csv = buildCSV(players, tallaRules, overrides, globalConfig);
  const preview = csv.split('\r\n').slice(0, 6).join('\n');

  function handleDownload() {
    const equipo = (globalConfig.EQUIPO || 'EQUIPO').replace(/\s+/g, '_').toUpperCase();
    const ts = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    downloadCSV(csv, `${equipo}_${ts}.csv`);
    onToast('CSV descargado', 'ok');
  }

  return (
    <div className="screen export-screen">
      <div className="export-header">
        <button className="btn btn-ghost" onClick={() => setScreen('configure')}>← VOLVER</button>
        <h2>EXPORTAR CSV</h2>
        <button className="btn btn-primary" onClick={handleDownload}>⬇ DESCARGAR CSV</button>
      </div>

      <div className="export-stats">
        <div className="stat-card"><div className="stat-num">{players.length}</div><div className="stat-lbl">JUGADORES</div></div>
        <div className="stat-card"><div className="stat-num">{tallas.length}</div><div className="stat-lbl">TALLAS</div></div>
        <div className="stat-card"><div className="stat-num">{CSV_COLUMN_ORDER.length}</div><div className="stat-lbl">COLUMNAS</div></div>
        <div className="stat-card"><div className="stat-num">{Object.keys(overrides).length}</div><div className="stat-lbl">OVERRIDES</div></div>
      </div>

      <div className="export-preview">
        <div className="preview-label">PREVIEW (primeras 5 filas)</div>
        <div className="preview-scroll">
          <pre className="preview-csv">{preview}</pre>
        </div>
      </div>
    </div>
  );
}
