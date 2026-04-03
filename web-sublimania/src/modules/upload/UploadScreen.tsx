// ============================================================
//  modules/upload/UploadScreen.tsx
// ============================================================
import { useRef } from 'react';
import { useTeamStore } from '../../store/useTeamStore';
import { parseExcelFile, extractTallas } from '../../utils/excelReader';
import { PLAYER_KEYS } from '../../utils/schema';

interface Props {
  onToast: (msg: string, type: 'ok' | 'error') => void;
}

export function UploadScreen({ onToast }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setPlayers } = useTeamStore();

  async function handleFile(file: File) {
    try {
      const players = await parseExcelFile(file);
      const tallas = extractTallas(players);
      setPlayers(players, tallas);
      onToast(`${players.length} jugadores cargados — ${tallas.length} tallas detectadas`, 'ok');
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Error al leer el archivo', 'error');
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div className="screen upload-screen">
      <div className="upload-box">
        <div className="upload-badge">PASO 01</div>
        <h2 className="upload-title">CARGÁ TU EXCEL</h2>
        <p className="upload-sub">Arrastrá o seleccioná el archivo con los jugadores</p>

        <div
          className="drop-zone"
          onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }}
          onDragLeave={e => e.currentTarget.classList.remove('drag-over')}
          onDrop={onDrop}
        >
          <div className="drop-label">SOLTÁ TU .XLSX ACÁ</div>
          <div className="drop-sub-label">
            Columnas requeridas: NOMBRE · TALLA · ALTO · ANCHO · MANGA_ALTO · MANGA_ANCHO
          </div>
          <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>
            SELECCIONAR ARCHIVO
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
            onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
          />
        </div>

        <div className="upload-cols-preview">
          <div className="cols-label">COLUMNAS DEL EXCEL</div>
          <div className="cols-list">
            {PLAYER_KEYS.map(k => <span key={k} className="col-tag">{k}</span>)}
          </div>
        </div>
      </div>
    </div>
  );
}
