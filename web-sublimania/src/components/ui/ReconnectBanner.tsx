// ============================================================
//  components/ui/ReconnectBanner.tsx
// ============================================================
import { useTeamStore } from '../../store/useTeamStore';
import { useConfigFileStore } from '../../store/useConfigFileStore';
import { parseSnapshot } from '../../utils/configFile';

interface Props {
  fileName: string;
  handle: FileSystemFileHandle;
  onDismiss: () => void;
  onToast: (msg: string, type: 'ok' | 'error') => void;
}

export function ReconnectBanner({ fileName, handle, onDismiss, onToast }: Props) {
  const { setFileHandle, setLastSaved } = useConfigFileStore();
  const { players, tallas, tallaRules, overrides, globalConfig } = useTeamStore();

  async function handleReconnect() {
    try {
      const perm = await handle.requestPermission({ mode: 'readwrite' });
      if (perm !== 'granted') return;

      const file = await handle.getFile();
      const text = await file.text();
      const snapshot = parseSnapshot(JSON.parse(text));

      // Usar el más reciente entre archivo y localStorage
      const fileDate  = new Date(snapshot.savedAt).getTime();
      const localDate = new Date(
        (useConfigFileStore.getState().lastSaved ?? '') || 0
      ).getTime();

      if (fileDate > localDate) {
        // Solo aplica si el archivo es más nuevo
        const store = useTeamStore.getState();
        store.setPlayers(snapshot.players, snapshot.tallas);
        // Restaurar reglas y overrides directamente (sin re-init)
        Object.entries(snapshot.tallaRules).forEach(([t, r]) => {
          Object.entries(r).forEach(([k, v]) => store.setTallaRule(t, k, v));
        });
        Object.entries(snapshot.overrides).forEach(([idx, ov]) => {
          Object.entries(ov as Record<string, string>).forEach(([k, v]) =>
            store.setOverride(Number(idx), k, v)
          );
        });
        Object.entries(snapshot.globalConfig).forEach(([k, v]) =>
          store.setGlobalConfig(k, v)
        );
        setLastSaved(snapshot.savedAt);
        onToast('Config cargada desde archivo → ' + handle.name, 'ok');
      }

      setFileHandle(handle);
      onDismiss();
    } catch { /* usuario canceló */ }
  }

  // Suprimir warning de variables no usadas (se usan vía store.getState())
  void players; void tallas; void tallaRules; void overrides; void globalConfig;

  return (
    <div className="reconnect-banner">
      <span className="reconnect-text">
        📁 Hay un archivo de config guardado: <strong>{fileName}</strong>
      </span>
      <button className="btn btn-sm" onClick={handleReconnect}>RECONECTAR</button>
      <button className="btn btn-ghost btn-sm" onClick={onDismiss}>✕</button>
    </div>
  );
}
