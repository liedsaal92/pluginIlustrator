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
      </div>
    </header>
  );
}
