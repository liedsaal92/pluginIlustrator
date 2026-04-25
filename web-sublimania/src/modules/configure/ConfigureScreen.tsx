// ============================================================
//  modules/configure/ConfigureScreen.tsx
// ============================================================
import { useTeamStore } from '../../store/useTeamStore';
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
    activeTalla,
    setConfigTab, setGlobalConfig,
  } = useTeamStore();

  const { statusClass, statusContent } = useSaveStatus();


  const primaryField   = GLOBAL_FIELDS[0];          // EQUIPO
  const secondaryFields = GLOBAL_FIELDS.slice(1);   // NOTAS + future

  return (
    <div className="screen configure-screen">
      <div className="config-sticky-top">
      <div className="config-header">

        {/* ── Single row: equipo · notas · save · stats ──── */}
        <div className="config-header-row">
          {primaryField && (
            <div className="config-primary-field">
              <label className="config-field-label">{primaryField.label.toUpperCase()}</label>
              <input
                type="text"
                className="config-equipo-input"
                value={globalConfig[primaryField.key]}
                placeholder={primaryField.placeholder}
                onChange={e => setGlobalConfig(primaryField.key, e.target.value)}
              />
            </div>
          )}

          <div className="config-divider" />

          {secondaryFields.map(f => (
            <div key={f.key} className="config-secondary-field">
              <label className="config-field-label">{f.label.toUpperCase()}</label>
              <input
                type="text"
                className="config-notas-input"
                value={globalConfig[f.key]}
                placeholder={f.placeholder}
                onChange={e => setGlobalConfig(f.key, e.target.value)}
              />
            </div>
          ))}

          <div className={statusClass} style={{ marginLeft: 'auto', flexShrink: 0 }}>{statusContent}</div>

          <div className="config-stats">
            <span className="stat-badge stat-players">{players.length} JUG.</span>
            <span className="stat-badge stat-tallas">{tallas.length} TALLAS</span>
            {configTab === 'rules' && activeTalla && (
              <span className="stat-badge stat-talla-active">✎ {activeTalla}</span>
            )}
          </div>
        </div>

      </div>

      <div className="config-tabs">
        <button
          className={`tab-btn ${configTab === 'rules' ? 'active' : ''}`}
          onClick={() => setConfigTab('rules')}
        >
          ⚙ REGLAS DE CAMISETAS
        </button>
        <button
          className={`tab-btn ${configTab === 'players' ? 'active' : ''}`}
          onClick={() => setConfigTab('players')}
        >
          👤 JUGADORES ({players.length})
        </button>
      </div>
      </div> {/* end config-sticky-top */}

      <div className="config-body">
        {configTab === 'rules' && <RulesTab onToast={onToast} />}
        {configTab === 'players' && (
          <div className="players-layout">
            <AddPlayerForm />
            {players.length === 0 && (
              <div className="players-empty-hint">
                <span className="players-empty-hint-icon">↑</span>
                <div className="players-empty-hint-body">
                  <div className="players-empty-hint-title">SIN JUGADORES CARGADOS</div>
                  <div className="players-empty-hint-text">Agregá jugadores uno por uno con el formulario de arriba, o importá la lista completa desde un Excel.</div>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ marginTop: '0.6rem' }}
                    onClick={() => useTeamStore.getState().setScreen('upload')}
                  >
                    ↑ CARGAR DESDE EXCEL
                  </button>
                </div>
              </div>
            )}
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
