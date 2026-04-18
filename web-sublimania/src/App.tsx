// ============================================================
//  App.tsx — Root: layout persistente con sidebar
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { useTeamStore } from './store/useTeamStore';
import { useTeamsStore } from './store/useTeamsStore';
import { useAuthStore } from './store/useAuthStore';
import { hasPermission } from './types/auth';
import { Sidebar } from './components/layout/Sidebar';
import { Toast } from './components/ui/Toast';
import { AuthScreen } from './modules/auth/AuthScreen';
import { TeamsScreen } from './modules/teams/TeamsScreen';
import { UploadScreen } from './modules/upload/UploadScreen';
import { ConfigureScreen } from './modules/configure/ConfigureScreen';
import { ExportScreen } from './modules/export/ExportScreen';
import { SettingsScreen } from './modules/settings/SettingsScreen';

interface ToastState { msg: string; type: 'ok' | 'error'; key: number; }

export default function App() {
  const screen  = useTeamStore(s => s.screen);
  const session = useAuthStore(s => s.session);
  const checkSession = useAuthStore(s => s.checkSession);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  function showToast(msg: string, type: 'ok' | 'error') {
    setToast({ msg, type, key: Date.now() });
  }

  // Validar sesión al arrancar
  useEffect(() => { checkSession(); }, [checkSession]);

  // Al arrancar con sesión: determinar pantalla inicial
  useEffect(() => {
    if (!session) return;
    const { teams, activeTeamId } = useTeamsStore.getState();
    const workingStore = useTeamStore.getState();

    if (teams.length === 0) {
      workingStore.setScreen('upload');
      return;
    }
    const activeTeam = teams.find(t => t.id === activeTeamId) ?? teams[0];
    if (activeTeam) {
      workingStore.loadFromEntry(activeTeam, 'teams');
      useTeamsStore.setState({ activeTeamId: activeTeam.id });
    } else {
      workingStore.setScreen('teams');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!session]);

  // Guard: employee sin permiso a settings → redirect
  useEffect(() => {
    if (!session) return;
    if (screen === 'settings' && !hasPermission(session.user.role, 'settings:manage')) {
      useTeamStore.getState().setScreen('teams');
    }
  }, [screen, session]);

  // Sin sesión → pantalla de auth
  if (!session) return <AuthScreen />;

  return (
    <div className="app-layout">
      {/* Overlay for mobile sidebar */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'sidebar-overlay-active' : ''}`}
        onClick={closeSidebar}
      />

      <Sidebar onToast={showToast} isOpen={sidebarOpen} onClose={closeSidebar} />

      <main className="app-main" id="app">
        {/* Mobile top bar with hamburger */}
        <div className="mobile-topbar">
          <button className="hamburger-btn" onClick={() => setSidebarOpen(o => !o)} aria-label="Menú">
            <span className="hamburger-line" />
            <span className="hamburger-line" />
            <span className="hamburger-line" />
          </button>
          <div className="mobile-topbar-logo">SUBLI<span>FLOW</span></div>
        </div>

        <div key={screen} className="screen-transition">
          {screen === 'teams'     && <TeamsScreen     onToast={showToast} />}
          {screen === 'upload'    && <UploadScreen    onToast={showToast} />}
          {screen === 'configure' && <ConfigureScreen onToast={showToast} />}
          {screen === 'export'    && <ExportScreen    onToast={showToast} />}
          {screen === 'settings'  && hasPermission(session.user.role, 'settings:manage') && (
            <SettingsScreen onToast={showToast} />
          )}
        </div>
      </main>

      {toast && (
        <Toast key={toast.key} message={toast.msg} type={toast.type} onDone={() => setToast(null)} />
      )}
    </div>
  );
}
