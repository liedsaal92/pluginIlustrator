// ============================================================
//  modules/configure/ConfigureScreen.tsx
// ============================================================
import { useTeamStore } from '../../store/useTeamStore';
import { GLOBAL_FIELDS } from '../../utils/schema';
import { SaveStatus } from '../../components/ui/SaveStatus';
import { RulesTab } from './RulesTab';
import { PlayerCard } from './PlayerCard';
import { TallasTab } from './TallasTab';
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

  return (
    <div className="screen configure-screen">
      <div className="config-header">
        <div className="config-header-left">
          <button className="btn btn-ghost btn-sm" onClick={() => setScreen('upload')}>← VOLVER</button>
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

        <SaveStatus onToast={onToast} />

        <button className="btn btn-primary" onClick={() => setScreen('export')}>
          EXPORTAR CSV →
        </button>
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
        <button
          className={`tab-btn ${configTab === 'tallas' ? 'active' : ''}`}
          onClick={() => setConfigTab('tallas')}
        >
          📐 TALLAS
        </button>
      </div>

      <div className="config-body">
        {configTab === 'rules' && <RulesTab onToast={onToast} />}
        {configTab === 'players' && (
          <div className="players-layout">
            <AddPlayerForm />
            {players.map((_, idx) => <PlayerCard key={idx} idx={idx} />)}
          </div>
        )}
        {configTab === 'tallas' && <TallasTab />}
      </div>
    </div>
  );
}
