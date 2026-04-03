// ============================================================
//  components/layout/Header.tsx
// ============================================================
export function Header() {
  return (
    <header className="site-header">
      <div className="ticker-wrap">
        <div className="ticker">
          <span>★ SUBLIMANIA ★ GENERADOR DE EQUIPOS ★ SUBLIMACIÓN DEPORTIVA ★ PLÓTER DE CORTE ★ EQUIPO COMPLETO ★ TALLAS · NOMBRES · NÚMEROS ★ SUBLIMANIA ★ GENERADOR DE EQUIPOS ★ SUBLIMACIÓN DEPORTIVA ★ PLÓTER DE CORTE ★ EQUIPO COMPLETO ★ TALLAS · NOMBRES · NÚMEROS ★</span>
          <span aria-hidden="true">★ SUBLIMANIA ★ GENERADOR DE EQUIPOS ★ SUBLIMACIÓN DEPORTIVA ★ PLÓTER DE CORTE ★ EQUIPO COMPLETO ★ TALLAS · NOMBRES · NÚMEROS ★ SUBLIMANIA ★ GENERADOR DE EQUIPOS ★ SUBLIMACIÓN DEPORTIVA ★ PLÓTER DE CORTE ★ EQUIPO COMPLETO ★ TALLAS · NOMBRES · NÚMEROS ★</span>
        </div>
      </div>
      <div className="header-main">
        <div className="logo">
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
        </div>
      </div>
    </header>
  );
}
