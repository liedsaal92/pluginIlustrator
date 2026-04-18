// ============================================================
//  modules/upload/UploadScreen.tsx
// ============================================================
import { useRef } from 'react';
import { useTeamStore } from '../../store/useTeamStore';
import { useTeamsStore } from '../../store/useTeamsStore';
import { useTallasStore } from '../../store/useTallasStore';
import { useClientesStore } from '../../store/useClientesStore';
import { parseExcelFile, extractTallas } from '../../utils/excelReader';
import { PLAYER_KEYS, buildEmptyRules, getDefaultGlobal } from '../../utils/schema';
import { exportBackup, importBackup, mergeBackup } from '../../utils/configBackup';

interface Props {
  onToast: (msg: string, type: 'ok' | 'error') => void;
}

export function UploadScreen({ onToast }: Props) {
  const fileInputRef   = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const { setPlayers, setScreen } = useTeamStore();
  const { teams, replaceAll } = useTeamsStore();

  function handleExportBackup() {
    const { clientes } = useClientesStore.getState();
    const { tallasPorCliente } = useTallasStore.getState();
    exportBackup(clientes, tallasPorCliente, teams);
    onToast('Configuración exportada', 'ok');
  }

  async function handleImportBackup(file: File) {
    try {
      const backup = await importBackup(file);
      const { clientes: curClientes } = useClientesStore.getState();
      const { tallasPorCliente: curTallas } = useTallasStore.getState();
      const result = mergeBackup(backup, curClientes, curTallas, teams);

      useClientesStore.setState({ clientes: result.clientes });
      useTallasStore.setState({ tallasPorCliente: result.tallasPorCliente });
      replaceAll(result.teams);

      const parts: string[] = [];
      if (result.teamsAdded)      parts.push(`${result.teamsAdded} equipo(s) nuevo(s)`);
      if (result.teamsUpdated)    parts.push(`${result.teamsUpdated} equipo(s) actualizado(s)`);
      if (result.clientesAdded)   parts.push(`${result.clientesAdded} cliente(s) nuevo(s)`);
      if (result.clientesUpdated) parts.push(`${result.clientesUpdated} cliente(s) actualizado(s)`);

      onToast(
        parts.length ? `Combinado: ${parts.join(', ')}` : 'Sin cambios nuevos',
        'ok',
      );
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Error al importar', 'error');
    }
  }

  async function handleFile(file: File) {
    try {
      const players = await parseExcelFile(file);
      const tallas = extractTallas(players);

      // Construir reglas vacías por talla
      const tallaRules: Record<string, ReturnType<typeof buildEmptyRules>> = {};
      tallas.forEach(t => { tallaRules[t] = buildEmptyRules(); });

      const globalConfig = getDefaultGlobal();

      // Crear o actualizar entrada en useTeamsStore
      const { activeTeamId, createTeam, saveTeam, getActiveTeam } = useTeamsStore.getState();
      if (activeTeamId) {
        // Ya existe un equipo activo (re-carga de Excel) — actualizar jugadores
        const current = getActiveTeam();
        saveTeam(activeTeamId, {
          nombre: current?.nombre || globalConfig.EQUIPO || 'Sin nombre',
          players, tallas, tallaRules,
          overrides: {}, globalConfig,
          exportHistory: current?.exportHistory ?? {},
        });
      } else {
        // Equipo nuevo
        createTeam({
          nombre: globalConfig.EQUIPO || 'Nuevo equipo',
          players, tallas, tallaRules,
          overrides: {}, globalConfig,
          exportHistory: {},
        });
      }

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
      <button className="btn btn-ghost btn-sm upload-back" onClick={() => setScreen('teams')}>
        ← EQUIPOS
      </button>
      <div className="upload-box">
        <div className="upload-badge">PASO 01</div>
        <h2 className="upload-title">CARGÁ TU EXCEL</h2>
        <p className="upload-sub">Arrastrá o seleccioná el archivo con los jugadores</p>

        <div
          className="drop-zone"
          onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }}
          onDragLeave={e => e.currentTarget.classList.remove('drag-over')}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="drop-icon">
            <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="4" y="4" width="48" height="48" stroke="currentColor" strokeWidth="2.5"/>
              <line x1="4" y1="22" x2="52" y2="22" stroke="currentColor" strokeWidth="1.5"/>
              <line x1="4" y1="38" x2="52" y2="38" stroke="currentColor" strokeWidth="1.5"/>
              <line x1="22" y1="4" x2="22" y2="52" stroke="currentColor" strokeWidth="1.5"/>
              <line x1="38" y1="4" x2="38" y2="52" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="4" y="4" width="18" height="18" fill="currentColor" fillOpacity="0.15"/>
            </svg>
          </div>
          <div className="drop-label">SOLTÁ TU .XLSX ACÁ</div>
          <div className="drop-sub-label">
            Columnas requeridas: NOMBRE · NOMBRE_CAMISETA · NUMERO · TALLA
          </div>
          <button className="btn btn-primary" onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>
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

        <div className="upload-template-link">
          <a href="/EJEMPLO-CARGA.xlsx" download="EJEMPLO-CARGA.xlsx" className="btn btn-outline-secondary btn-sm">
            ⬇ Descargar plantilla de ejemplo
          </a>
        </div>

        <div className="upload-backup">
          <div className="upload-backup-label">CONFIGURACIÓN</div>
          <div className="upload-backup-actions">
            <button className="btn btn-ghost btn-sm" onClick={handleExportBackup}>
              ⬆ Exportar configuración
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => importInputRef.current?.click()}>
              ⬇ Importar configuración
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={e => {
                if (e.target.files?.[0]) handleImportBackup(e.target.files[0]);
                e.target.value = '';
              }}
            />
          </div>
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
