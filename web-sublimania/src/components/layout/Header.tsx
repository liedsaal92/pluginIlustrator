// ============================================================
//  components/layout/Header.tsx
// ============================================================
import { useTeamStore } from '../../store/useTeamStore';

export function Header() {
  const setScreen = useTeamStore(s => s.setScreen);

  return (
    <header className="site-header">
<div className="header-main">
        <div className="logo" onClick={() => setScreen('upload')} style={{ cursor: 'pointer' }}>
          <div className="logo-name">SUBLI<span>FLOW</span></div>
          <div className="logo-tag">Motor de Automatización de Producción Deportiva v1.0</div>
        </div>
      </div>
    </header>
  );
}
