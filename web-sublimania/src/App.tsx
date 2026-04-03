// ============================================================
//  App.tsx — Root: routing entre pantallas
// ============================================================
import { useState, useEffect } from 'react';
import { useTeamStore } from './store/useTeamStore';
import { useConfigFileStore } from './store/useConfigFileStore';
import { tryReconnectFile } from './utils/configFile';
import { Header } from './components/layout/Header';
import { Toast } from './components/ui/Toast';
import { ReconnectBanner } from './components/ui/ReconnectBanner';
import { UploadScreen } from './modules/upload/UploadScreen';
import { ConfigureScreen } from './modules/configure/ConfigureScreen';
import { ExportScreen } from './modules/export/ExportScreen';

interface ToastState { msg: string; type: 'ok' | 'error'; key: number; }
interface BannerState { handle: FileSystemFileHandle; name: string; }

export default function App() {
  const screen = useTeamStore(s => s.screen);
  const { setFileHandle, setLastSaved } = useConfigFileStore();
  const [toast, setToast] = useState<ToastState | null>(null);
  const [banner, setBanner] = useState<BannerState | null>(null);

  function showToast(msg: string, type: 'ok' | 'error') {
    setToast({ msg, type, key: Date.now() });
  }

  // Al arrancar: intentar reconectar con el archivo guardado
  useEffect(() => {
    tryReconnectFile().then(result => {
      if (result.status === 'loaded') {
        const { handle, snapshot } = result;
        setFileHandle(handle);
        setLastSaved(snapshot.savedAt);

        // Solo aplica si hay jugadores en el archivo y ninguno en el store
        const store = useTeamStore.getState();
        if (snapshot.players.length > 0 && store.players.length === 0) {
          store.setPlayers(snapshot.players, snapshot.tallas);
          Object.entries(snapshot.tallaRules).forEach(([t, r]) =>
            Object.entries(r).forEach(([k, v]) => store.setTallaRule(t, k, v))
          );
          Object.entries(snapshot.overrides).forEach(([idx, ov]) =>
            Object.entries(ov as Record<string, string>).forEach(([k, v]) =>
              store.setOverride(Number(idx), k, v)
            )
          );
          Object.entries(snapshot.globalConfig).forEach(([k, v]) => store.setGlobalConfig(k, v));
          showToast('Config cargada desde archivo → ' + handle.name, 'ok');
        }
      } else if (result.status === 'needs-permission') {
        setBanner({ handle: result.handle, name: result.name });
      }
    });
  }, [setFileHandle, setLastSaved]);

  return (
    <>
      <Header />
      <main id="app">
        {screen === 'upload'    && <UploadScreen    onToast={showToast} />}
        {screen === 'configure' && <ConfigureScreen onToast={showToast} />}
        {screen === 'export'    && <ExportScreen    onToast={showToast} />}
      </main>
      {toast && (
        <Toast key={toast.key} message={toast.msg} type={toast.type} onDone={() => setToast(null)} />
      )}
      {banner && (
        <ReconnectBanner
          fileName={banner.name}
          handle={banner.handle}
          onDismiss={() => setBanner(null)}
          onToast={showToast}
        />
      )}
    </>
  );
}
