// ============================================================
//  components/layout/Header.tsx
// ============================================================
import { useTeamStore } from '../../store/useTeamStore';

export function Header() {
  const setScreen = useTeamStore(s => s.setScreen);

  return (
    <header className="site-header">
      <div className="ticker-wrap">
        <div className="ticker">
          <span>★ SUBLIMANIA ★ GENERADOR DE EQUIPOS ★ SUBLIMACIÓN DEPORTIVA ★ PLÓTER DE CORTE ★ EQUIPO COMPLETO ★ TALLAS · NOMBRES · NÚMEROS ★ SUBLIMANIA ★ GENERADOR DE EQUIPOS ★ SUBLIMACIÓN DEPORTIVA ★ PLÓTER DE CORTE ★ EQUIPO COMPLETO ★ TALLAS · NOMBRES · NÚMEROS ★</span>
          <span aria-hidden="true">★ SUBLIMANIA ★ GENERADOR DE EQUIPOS ★ SUBLIMACIÓN DEPORTIVA ★ PLÓTER DE CORTE ★ EQUIPO COMPLETO ★ TALLAS · NOMBRES · NÚMEROS ★ SUBLIMANIA ★ GENERADOR DE EQUIPOS ★ SUBLIMACIÓN DEPORTIVA ★ PLÓTER DE CORTE ★ EQUIPO COMPLETO ★ TALLAS · NOMBRES · NÚMEROS ★</span>
        </div>
      </div>
      <div className="header-main">
        <div className="logo" onClick={() => setScreen('upload')} style={{ cursor: 'pointer' }}>
          <div className="logo-name">SUBLI<span>MANIA</span></div>
          <div className="logo-tag">GENERADOR DE EQUIPOS DEPORTIVOS v2.0</div>
        </div>
        <div className="header-deco">
          <svg className="header-jersey" viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M35 8 Q45 2 55 5 Q60 12 65 12 Q70 12 75 5 Q85 2 95 8 L115 28 L98 36 L95 20 L95 88 L35 88 L35 20 L32 36 L15 28 Z"
              fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinejoin="round"
            />
          </svg>
          <button
            className="btn-settings"
            title="Configuración"
            onClick={() => setScreen('settings')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
