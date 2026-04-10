// ============================================================
//  modules/configure/ConfigureScreen.tsx
// ============================================================
import { useTeamStore } from '../../store/useTeamStore';
import { saveActiveTeam } from '../../store/useTeamsStore';
import { GLOBAL_FIELDS, getGeneroTalla, getNumeroTalla } from '../../utils/schema';
import { useSaveStatus } from '../../components/ui/SaveStatus';
import { RulesTab } from './RulesTab';
import { PlayerCard } from './PlayerCard';
import { AddPlayerForm } from './AddPlayerForm';

interface Props {
  onToast: (msg: string, type: 'ok' | 'error') => void;
}

export function ConfigureScreen({ onToast }: Props) {
  const {
    players, tallas,
    configTab, globalConfig,
    setScreen, setConfigTab, setGlobalConfig,
  } = useTeamStore();

  const { statusClass, statusContent, handleSaveAndGoTeams } = useSaveStatus();

  return (
    <div className="screen configure-screen">
      <div className="config-header">
        <div className="config-header-left">
          <button className="btn btn-ghost btn-sm" onClick={() => { saveActiveTeam(); setScreen('upload'); }}>← VOLVER</button>
          <div className="config-stats">
            <span className="stat-badge stat-players">{players.length} JUGADORES</span>
            <span className="stat-badge stat-tallas">{tallas.length} TALLAS</span>
          </div>
        </div>

        <div className="config-global">
          {GLOBAL_FIELDS.map(f => (
            <div key={f.key} className="global-field">
              <label>{f.label.toUpperCase()}</label>
              <input
                type="text"
                className="input-global"
                value={globalConfig[f.key]}
                placeholder={f.placeholder}
                onChange={e => setGlobalConfig(f.key, e.target.value)}
              />
            </div>
          ))}
        </div>

        <div className="config-header-right">
          <div className={statusClass}>{statusContent}</div>
          <div className="config-actions">
            <button className="btn btn-ghost btn-sm" onClick={handleSaveAndGoTeams} title="Ver todos los equipos">
              ☰ EQUIPOS
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => { saveActiveTeam(); setScreen('export'); }}>
              EXPORTAR CSV →
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => { saveActiveTeam(); setScreen('settings'); }} title="Configuración">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="config-tabs">
        <button
          className={`tab-btn ${configTab === 'rules' ? 'active' : ''}`}
          onClick={() => setConfigTab('rules')}
        >
          ⚙ REGLAS POR TALLA
        </button>
        <button
          className={`tab-btn ${configTab === 'players' ? 'active' : ''}`}
          onClick={() => setConfigTab('players')}
        >
          👤 JUGADORES ({players.length})
        </button>
      </div>

      <div className="config-body">
        {configTab === 'rules' && <RulesTab onToast={onToast} />}
        {configTab === 'players' && (
          <div className="players-layout">
            <AddPlayerForm />
            {(() => {
              const sorted = [...players.keys()].sort((a, b) => {
                const ga = getGeneroTalla(players[a].TALLA);
                const gb = getGeneroTalla(players[b].TALLA);
                const order = { H: 0, M: 1, other: 2 } as const;
                if (ga !== gb) return order[ga] - order[gb];
                return getNumeroTalla(players[a].TALLA) - getNumeroTalla(players[b].TALLA);
              });
              let lastGenero: string | null = null;
              return sorted.map(idx => {
                const genero = getGeneroTalla(players[idx].TALLA);
                const header = genero !== lastGenero
                  ? (() => { lastGenero = genero; return (
                    <div key={`hdr-${genero}`} className={`players-gender-header players-gender-header--${genero.toLowerCase()}`}>
                      {genero === 'H' ? '♂ HOMBRES' : genero === 'M' ? '♀ MUJERES' : '— OTROS'}
                    </div>
                  ); })()
                  : null;
                return [header, <PlayerCard key={idx} idx={idx} />];
              });
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
