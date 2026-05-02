// ============================================================
//  App.tsx — Root: layout persistente con sidebar
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { useTeamStore } from './store/useTeamStore';
import { useTeamsStore } from './store/useTeamsStore';
import { useAuthStore } from './store/useAuthStore';
import { useClientesStore } from './store/useClientesStore';
import { useMoldesStore } from './store/useMoldesStore';
import { useTallasStore } from './store/useTallasStore';
import { supabase } from './utils/supabase';
import { Sidebar } from './components/layout/Sidebar';
import { Toast } from './components/ui/Toast';
import { AuthScreen } from './modules/auth/AuthScreen';
import { PortalScreen } from './modules/portal/PortalScreen';
import { TeamsScreen } from './modules/teams/TeamsScreen';
import { UploadScreen } from './modules/upload/UploadScreen';
import { ConfigureScreen } from './modules/configure/ConfigureScreen';
import { ExportScreen } from './modules/export/ExportScreen';
import { SettingsScreen } from './modules/settings/SettingsScreen';
import { PreviewScreen } from './modules/preview/PreviewScreen';
import { ClienteScreen } from './modules/cliente/ClienteScreen';
import { PricingScreen } from './modules/pricing/PricingScreen';

interface ToastState { msg: string; type: 'ok' | 'error'; key: number; }

// Detectar ruta pública /portal/TOKEN antes de cualquier auth
const portalMatch = window.location.pathname.match(/^\/portal\/([^/]+)/);

export default function App() {
  if (portalMatch) return <PortalScreen token={portalMatch[1]} />;
  const screen  = useTeamStore(s => s.screen);
  const session = useAuthStore(s => s.session);
  const checkSession = useAuthStore(s => s.checkSession);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    localStorage.getItem('sidebar_collapsed') === 'true'
  );
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    (localStorage.getItem('theme') as 'light' | 'dark') ?? 'light'
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const toggleSidebarCollapse = useCallback(() => {
    setSidebarCollapsed(v => {
      const next = !v;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  }, []);
  const toggleTheme = useCallback(() => setTheme(t => t === 'light' ? 'dark' : 'light'), []);

  function showToast(msg: string, type: 'ok' | 'error') {
    setToast({ msg, type, key: Date.now() });
  }

  // Validar sesión al arrancar
  useEffect(() => { checkSession(); }, [checkSession]);

  // Detectar recovery session de Supabase (password reset desde email)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        useAuthStore.setState({ recoveryMode: true });
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Cargar datos desde Supabase cuando hay sesión
  useEffect(() => {
    if (!session) return;
    useClientesStore.getState().init();
    useMoldesStore.getState().init();
    useTallasStore.getState().init();
    useTeamsStore.getState().init().then(() => {
      const { teams, activeTeamId } = useTeamsStore.getState();
      const workingStore = useTeamStore.getState();
      if (teams.length === 0) { workingStore.setScreen('upload'); return; }
      const activeTeam = teams.find(t => t.id === activeTeamId) ?? teams[0];
      if (activeTeam) {
        workingStore.loadFromEntry(activeTeam, 'teams');
        useTeamsStore.setState({ activeTeamId: activeTeam.id });
      } else {
        workingStore.setScreen('teams');
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!session]);



  // Sin sesión → pantalla de auth
  if (!session) return <AuthScreen />;

  // Cliente → dashboard propio (sin sidebar normal)
  if (session.user.role === 'cliente') {
    return (
      <>
        <div className="app-layout cliente-layout">
          <main className="app-main cliente-main" id="app">
            <div className="mobile-topbar">
              <div className="mobile-topbar-logo">SUBLI<span>FLOW</span></div>
              <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto', fontSize: '0.75rem' }}
                onClick={() => useAuthStore.getState().logout()}>
                Salir
              </button>
            </div>
            <ClienteScreen onToast={showToast} />
          </main>
        </div>
        {toast && <Toast key={toast.key} message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      </>
    );
  }

  return (
    <div className="app-layout">
      {/* Overlay for mobile sidebar */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'sidebar-overlay-active' : ''}`}
        onClick={closeSidebar}
      />

      <Sidebar onToast={showToast} isOpen={sidebarOpen} onClose={closeSidebar} collapsed={sidebarCollapsed} onToggleCollapse={toggleSidebarCollapse} theme={theme} onToggleTheme={toggleTheme} />

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
          {screen === 'preview'   && <PreviewScreen   onToast={showToast} />}
          {screen === 'pricing'   && <PricingScreen   onToast={showToast} />}
          {screen === 'settings'  && <SettingsScreen onToast={showToast} />}
        </div>
      </main>

      {toast && (
        <Toast key={toast.key} message={toast.msg} type={toast.type} onDone={() => setToast(null)} />
      )}
    </div>
  );
}
