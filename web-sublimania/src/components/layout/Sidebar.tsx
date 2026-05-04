// ============================================================
//  components/layout/Sidebar.tsx — Navegación persistente
// ============================================================
import { useRef } from 'react';
import { useTeamStore } from '../../store/useTeamStore';
import { useTeamsStore, saveActiveTeam } from '../../store/useTeamsStore';
import { useClientesStore } from '../../store/useClientesStore';
import { useTallasStore } from '../../store/useTallasStore';
import { useAuthStore } from '../../store/useAuthStore';
import { usePermission } from '../../hooks/usePermission';
import { exportBackup, importBackup, mergeBackup } from '../../utils/configBackup';

interface Props {
  onToast: (msg: string, type: 'ok' | 'error') => void;
  isOpen?: boolean;
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export function Sidebar({ onToast, isOpen, onClose, collapsed, onToggleCollapse, theme, onToggleTheme }: Props) {
  const screen    = useTeamStore(s => s.screen);
  const setScreen = useTeamStore(s => s.setScreen);
  const players   = useTeamStore(s => s.players);
  const { session, logout } = useAuthStore();
  const { teams, activeTeamId } = useTeamsStore();
  const activeTeam = teams.find(t => t.id === activeTeamId);
  const canManageSettings = usePermission('settings:manage');
  const importInputRef = useRef<HTMLInputElement>(null);

  const hasPlayers = players.length > 0;

  // Indicador de paso para el workspace
  function stepStatus(forScreen: string): 'done' | 'active' | 'pending' {
    if (screen === forScreen) return 'active';
    if (forScreen === 'upload' && hasPlayers) return 'done';
    if (forScreen === 'configure' && hasPlayers && screen === 'export') return 'done';
    return 'pending';
  }

  function handleExportBackup() {
    saveActiveTeam();
    const { teams: allTeams } = useTeamsStore.getState();
    const { clientes }        = useClientesStore.getState();
    const { tallasPorCliente } = useTallasStore.getState();
    exportBackup(clientes, tallasPorCliente, allTeams);
    onToast('Configuración exportada', 'ok');
  }

  async function handleImportBackupFile(file: File) {
    try {
      const backup = await importBackup(file);
      const { clientes: curClientes }          = useClientesStore.getState();
      const { tallasPorCliente: curTallas }    = useTallasStore.getState();
      const result = mergeBackup(backup, curClientes, curTallas, useTeamsStore.getState().teams);
      useClientesStore.setState({ clientes: result.clientes });
      useTallasStore.setState({ tallasPorCliente: result.tallasPorCliente });
      useTeamsStore.getState().replaceAll(result.teams);
      onToast('Combinado correctamente', 'ok');
    } catch (e) {
      onToast((e as Error).message ?? 'Error al importar', 'error');
    }
  }

  function handleNavClick(action: () => void) {
    action();
    onClose?.();
  }

  return (
    <nav className={`sidebar ${isOpen ? 'sidebar-open' : ''} ${collapsed ? 'sidebar-collapsed' : ''}`}>

      {/* ── BRAND ────────────────────────────────────────────── */}
      <div className="sidebar-brand-wrap">
        <div
          className="sidebar-brand"
          onClick={collapsed && onToggleCollapse
            ? onToggleCollapse
            : () => handleNavClick(() => { saveActiveTeam(); setScreen('teams'); })
          }
          role="button"
          tabIndex={0}
          title={collapsed ? 'Expandir sidebar' : undefined}
        >
          <div className="sidebar-logo-name">S<span className="sidebar-brand-text">UBLI<span>FLOW</span></span></div>
          <div className="sidebar-logo-tag sidebar-brand-text">// PRODUCCIÓN DEPORTIVA v1.0</div>
        </div>
        {onToggleCollapse && (
          <button
            className="sidebar-collapse-btn"
            onClick={onToggleCollapse}
            title={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
          >
            {collapsed ? '›' : '‹'}
          </button>
        )}
      </div>

      {/* ── NAV ──────────────────────────────────────────────── */}
      <div className="sidebar-nav">

        {/* Equipos */}
        <div className="sidebar-section">
          <button
            className={`sidebar-nav-item ${screen === 'teams' ? 'active' : ''}`}
            onClick={() => handleNavClick(() => { saveActiveTeam(); setScreen('teams'); })}
            title="Mis Equipos"
          >
            <span className="sidebar-nav-item-icon">☰</span>
            <span className="sidebar-nav-text">MIS EQUIPOS</span>
            {teams.length > 0 && (
              <span className="sidebar-count-badge sidebar-nav-text">{teams.length}</span>
            )}
          </button>
        </div>

        {/* Workspace (equipo activo) */}
        <div className="sidebar-section">
          <div className="sidebar-section-label sidebar-nav-text">EQUIPO ACTIVO</div>
          {activeTeam ? (
            <>
              <div className="sidebar-active-team-name sidebar-nav-text">{activeTeam.nombre || '— sin nombre'}</div>

              <button
                className={`sidebar-nav-item sub ${screen === 'upload' ? 'active' : ''}`}
                onClick={() => handleNavClick(() => setScreen('upload'))}
                title="Cargar Excel"
              >
                <span className="sidebar-nav-item-icon">↑</span>
                <span className="sidebar-nav-text">CARGAR EXCEL</span>
                <span className={`sidebar-step-dot ${stepStatus('upload')}`} />
              </button>

              <button
                className={`sidebar-nav-item sub ${screen === 'configure' ? 'active' : ''}`}
                onClick={() => handleNavClick(() => { saveActiveTeam(); setScreen('configure'); })}
                title="Configurar"
              >
                <span className="sidebar-nav-item-icon">⚙</span>
                <span className="sidebar-nav-text">CONFIGURAR</span>
                <span className={`sidebar-step-dot ${stepStatus('configure')}`} />
              </button>

              <button
                className={`sidebar-export-btn ${screen === 'export' ? 'active' : ''}`}
                onClick={() => handleNavClick(() => { saveActiveTeam(); setScreen('export'); })}
                title="Exportar CSV"
              >
                <span className="sidebar-nav-item-icon">↗</span>
                <span className="sidebar-nav-text">EXPORTAR CSV</span>
                <span className={`sidebar-step-dot ${stepStatus('export')}`} />
              </button>

              <button
                className={`sidebar-nav-item sub ${screen === 'preview' ? 'active' : ''}`}
                onClick={() => handleNavClick(() => { saveActiveTeam(); setScreen('preview'); })}
                title="Preview"
              >
                <span className="sidebar-nav-item-icon">◫</span>
                <span className="sidebar-nav-text">PREVIEW</span>
              </button>
            </>
          ) : (
            <div className="sidebar-no-team">
              <div className="sidebar-no-team-glyph">
                <svg viewBox="0 0 32 32" fill="none" width="28" height="28">
                  <rect x="2" y="2" width="28" height="28" stroke="currentColor" strokeWidth="1.5"/>
                  <line x1="2" y1="11" x2="30" y2="11" stroke="currentColor" strokeWidth="1"/>
                  <line x1="2" y1="20" x2="30" y2="20" stroke="currentColor" strokeWidth="1"/>
                  <line x1="12" y1="2" x2="12" y2="30" stroke="currentColor" strokeWidth="1"/>
                  <line x1="21" y1="2" x2="21" y2="30" stroke="currentColor" strokeWidth="1"/>
                </svg>
              </div>
              <span className="sidebar-no-team-label">SIN EQUIPO<br/>ACTIVO</span>
              <span className="sidebar-no-team-hint">Seleccioná uno en<br/>Mis Equipos ↑</span>
            </div>
          )}
        </div>        <div className="sidebar-section">
          <div className="sidebar-section-label sidebar-nav-text">PRECIOS</div>
          <button
            className={`sidebar-nav-item sub ${screen === 'pricing_cotizador' ? 'active' : ''}`}
            onClick={() => handleNavClick(() => { saveActiveTeam(); setScreen('pricing_cotizador'); })}
            title="Cotizador"
          >
            <span className="sidebar-nav-item-icon">$</span>
            <span className="sidebar-nav-text">COTIZADOR</span>
          </button>
          <button
            className={`sidebar-nav-item sub ${screen === 'pricing_costos' ? 'active' : ''}`}
            onClick={() => handleNavClick(() => { saveActiveTeam(); setScreen('pricing_costos'); })}
            title="Costos Base"
          >
            <span className="sidebar-nav-item-icon">◎</span>
            <span className="sidebar-nav-text">COSTOS BASE</span>
          </button>
          <button
            className={`sidebar-nav-item sub ${screen === 'pricing_tablas' ? 'active' : ''}`}
            onClick={() => handleNavClick(() => { saveActiveTeam(); setScreen('pricing_tablas'); })}
            title="Tablas de Precios"
          >
            <span className="sidebar-nav-item-icon">≡</span>
            <span className="sidebar-nav-text">PRECIOS BASE</span>
          </button>
          <button
            className={`sidebar-nav-item sub ${screen === 'pricing_mercado' ? 'active' : ''}`}
            onClick={() => handleNavClick(() => { saveActiveTeam(); setScreen('pricing_mercado'); })}
            title="Mercado"
          >
            <span className="sidebar-nav-item-icon">◎</span>
            <span className="sidebar-nav-text">MERCADO</span>
          </button>
          <button
            className={`sidebar-nav-item sub ${screen === 'pricing_tabla_cliente' ? 'active' : ''}`}
            onClick={() => handleNavClick(() => { saveActiveTeam(); setScreen('pricing_tabla_cliente'); })}
            title="Tabla para cliente"
          >
            <span className="sidebar-nav-item-icon">↗</span>
            <span className="sidebar-nav-text">TABLAS DE PRECIOS</span>
          </button>
        </div>



        <div className="sidebar-section">
          <button
            className={`sidebar-nav-item ${screen === 'settings' ? 'active' : ''}`}
            onClick={() => handleNavClick(() => { saveActiveTeam(); setScreen('settings'); })}
            title="Ajustes"
          >
            <span className="sidebar-nav-item-icon">◈</span>
            <span className="sidebar-nav-text">AJUSTES</span>
          </button>
        </div>

      </div>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <div className="sidebar-footer">

        {/* Config backup — admin only */}
        {canManageSettings && (
          <div className="sidebar-backup sidebar-nav-text">
            <div className="sidebar-backup-label">// BACKUP</div>
            <div className="sidebar-backup-actions">
              <button
                className="sidebar-backup-btn"
                onClick={() => importInputRef.current?.click()}
                title="Importar configuración"
              >
                ↓ IMPORTAR
              </button>
              <input
                ref={importInputRef}
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={e => {
                  if (e.target.files?.[0]) handleImportBackupFile(e.target.files[0]);
                  e.target.value = '';
                }}
              />
              <button
                className="sidebar-backup-btn"
                onClick={handleExportBackup}
                title="Exportar configuración"
              >
                ↑ EXPORTAR
              </button>
            </div>
          </div>
        )}

        {/* Theme toggle */}
        {onToggleTheme && (
          <button
            className="sidebar-theme-toggle sidebar-nav-text"
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {theme === 'dark' ? (
              <>
                <svg viewBox="0 0 20 20" fill="none" width="14" height="14" aria-hidden="true">
                  <circle cx="10" cy="10" r="4" stroke="currentColor" strokeWidth="1.8"/>
                  <line x1="10" y1="1" x2="10" y2="3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  <line x1="10" y1="16.5" x2="10" y2="19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  <line x1="1" y1="10" x2="3.5" y2="10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  <line x1="16.5" y1="10" x2="19" y2="10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  <line x1="3.2" y1="3.2" x2="5" y2="5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  <line x1="15" y1="15" x2="16.8" y2="16.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  <line x1="3.2" y1="16.8" x2="5" y2="15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  <line x1="15" y1="5" x2="16.8" y2="3.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
                <span>MODO CLARO</span>
              </>
            ) : (
              <>
                <svg viewBox="0 0 20 20" fill="none" width="14" height="14" aria-hidden="true">
                  <path d="M17 11.5A7 7 0 1 1 8.5 3a5 5 0 0 0 8.5 8.5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
                </svg>
                <span>MODO OSCURO</span>
              </>
            )}
          </button>
        )}

        {/* User info + logout */}
        {session && (
          <div className="sidebar-user-section sidebar-nav-text">
            <div className="sidebar-user-top">
              <div className="sidebar-user-name">{session.user.nombre}</div>
              <span className={`sidebar-role-badge role-${session.user.role}`}>
                {session.user.role.toUpperCase()}
              </span>
            </div>
            <div className="sidebar-user-org">{session.user.orgName}</div>
            <button className="sidebar-logout-btn" onClick={() => logout()}>
              SALIR
            </button>
          </div>
        )}

      </div>

    </nav>
  );
}
