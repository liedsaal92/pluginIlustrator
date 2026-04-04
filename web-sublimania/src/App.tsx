// ============================================================
//  App.tsx — Root: routing entre pantallas
// ============================================================
import { useState, useEffect } from 'react';
import { useTeamStore } from './store/useTeamStore';
import { useTeamsStore } from './store/useTeamsStore';
import { Header } from './components/layout/Header';
import { Toast } from './components/ui/Toast';
import { TeamsScreen } from './modules/teams/TeamsScreen';
import { UploadScreen } from './modules/upload/UploadScreen';
import { ConfigureScreen } from './modules/configure/ConfigureScreen';
import { ExportScreen } from './modules/export/ExportScreen';

interface ToastState { msg: string; type: 'ok' | 'error'; key: number; }

export default function App() {
  const screen = useTeamStore(s => s.screen);
  const [toast, setToast] = useState<ToastState | null>(null);

  function showToast(msg: string, type: 'ok' | 'error') {
    setToast({ msg, type, key: Date.now() });
  }

  // Al arrancar: determinar pantalla inicial según equipos guardados
  useEffect(() => {
    const { teams, activeTeamId } = useTeamsStore.getState();
    const workingStore = useTeamStore.getState();

    if (teams.length === 0) {
      // Sin equipos → ir a upload
      workingStore.setScreen('upload');
      return;
    }

    // Hay equipos — ir a teams screen
    const activeTeam = teams.find(t => t.id === activeTeamId) ?? teams[0];
    if (activeTeam) {
      workingStore.loadFromEntry(activeTeam, 'teams');
      useTeamsStore.setState({ activeTeamId: activeTeam.id });
    } else {
      workingStore.setScreen('teams');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Header />
      <main id="app">
        {screen === 'teams'     && <TeamsScreen     onToast={showToast} />}
        {screen === 'upload'    && <UploadScreen    onToast={showToast} />}
        {screen === 'configure' && <ConfigureScreen onToast={showToast} />}
        {screen === 'export'    && <ExportScreen    onToast={showToast} />}
      </main>
      {toast && (
        <Toast key={toast.key} message={toast.msg} type={toast.type} onDone={() => setToast(null)} />
      )}
    </>
  );
}
