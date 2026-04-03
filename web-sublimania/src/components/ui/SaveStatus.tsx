// ============================================================
//  components/ui/SaveStatus.tsx — Indicador + botones guardar/cargar
// ============================================================
import { useTeamStore } from '../../store/useTeamStore';
import { useConfigFileStore } from '../../store/useConfigFileStore';
import { buildSnapshot, saveToFile, loadFromFile } from '../../utils/configFile';

interface Props {
  onToast: (msg: string, type: 'ok' | 'error') => void;
}

export function SaveStatus({ onToast }: Props) {
  const { players, tallas, tallaRules, overrides, globalConfig, setPlayers } = useTeamStore();
  const { fileHandle, lastSaved, setFileHandle, setLastSaved } = useConfigFileStore();

  async function handleSave() {
    if (!window.showSaveFilePicker) {
      onToast('Tu navegador no soporta File System Access API. Usá Chrome o Edge.', 'error');
      return;
    }
    try {
      const snapshot = buildSnapshot(players, tallas, tallaRules, overrides, globalConfig);
      const handle = await saveToFile(fileHandle, snapshot);
      setFileHandle(handle);
      setLastSaved(snapshot.savedAt);
      onToast('Config guardada → ' + handle.name, 'ok');
    } catch (e) {
      if ((e as DOMException).name !== 'AbortError') {
        onToast('Error al guardar: ' + (e as Error).message, 'error');
      }
    }
  }

  async function handleLoad() {
    if (!window.showOpenFilePicker) {
      onToast('Tu navegador no soporta File System Access API. Usá Chrome o Edge.', 'error');
      return;
    }
    try {
      const { handle, snapshot } = await loadFromFile();
      setFileHandle(handle);
      setLastSaved(snapshot.savedAt);

      // Aplicar snapshot al store
      setPlayers(snapshot.players, snapshot.tallas);
      const store = useTeamStore.getState();
      Object.entries(snapshot.tallaRules).forEach(([t, r]) => {
        Object.entries(r).forEach(([k, v]) => store.setTallaRule(t, k, v));
      });
      Object.entries(snapshot.overrides).forEach(([idx, ov]) => {
        Object.entries(ov as Record<string, string>).forEach(([k, v]) =>
          store.setOverride(Number(idx), k, v)
        );
      });
      Object.entries(snapshot.globalConfig).forEach(([k, v]) => store.setGlobalConfig(k, v));

      onToast('Config cargada desde ' + handle.name, 'ok');
    } catch (e) {
      if ((e as DOMException).name !== 'AbortError') {
        onToast('Error al cargar: ' + (e as Error).message, 'error');
      }
    }
  }

  // ── Render del indicador de estado ───────────────────────────
  let statusClass = 'save-status save-none';
  let statusContent = <span className="save-time">Sin archivo de config</span>;

  if (fileHandle && lastSaved) {
    const d = new Date(lastSaved);
    const label = d.toLocaleDateString('es-AR') + ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    statusClass = 'save-status save-ok';
    statusContent = (
      <>
        <span className="save-file">{fileHandle.name}</span>
        <span className="save-time">Guardado {label}</span>
      </>
    );
  } else if (fileHandle) {
    statusClass = 'save-status save-pending';
    statusContent = (
      <>
        <span className="save-file">{fileHandle.name}</span>
        <span className="save-time">Sin guardar</span>
      </>
    );
  }

  return (
    <div className="header-file-actions">
      <div className={statusClass}>{statusContent}</div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button className="btn btn-sm" title="Guarda la configuración como archivo JSON" onClick={handleSave}>
          💾 GUARDAR CONFIG
        </button>
        <button className="btn btn-ghost btn-sm" title="Cargar configuración desde un archivo JSON" onClick={handleLoad}>
          📂 CARGAR
        </button>
      </div>
    </div>
  );
}
