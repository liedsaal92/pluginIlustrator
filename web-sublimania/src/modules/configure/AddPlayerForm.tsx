// ============================================================
//  modules/configure/AddPlayerForm.tsx
//  Formulario para agregar un jugador manualmente
// ============================================================
import { useState } from 'react';
import { useTeamStore } from '../../store/useTeamStore';
import { useTallasStore } from '../../store/useTallasStore';
import { sortTallas, getGeneroTalla } from '../../utils/schema';
import type { Player } from '../../types';

const EMPTY: Player = { NOMBRE: '', NOMBRE_CAMISETA: '', NUMERO: '', TALLA: '' };

export function AddPlayerForm() {
  const addPlayer = useTeamStore(s => s.addPlayer);
  const teamTallas = useTeamStore(s => s.tallas);
  const tallasPorCliente = useTallasStore(s => s.tallasPorCliente);
  const [form, setForm] = useState<Player>({ ...EMPTY });
  const [open, setOpen] = useState(false);

  // Team tallas (from Excel) as primary source; fallback to tallas defined in moldes
  const moldesTallas = [...new Set(
    Object.values(tallasPorCliente).flatMap(byMolde =>
      Object.values(byMolde).flatMap(byTalla => Object.keys(byTalla))
    )
  )];
  const tallaOptions = sortTallas([...new Set([...teamTallas, ...moldesTallas])]);
  const hTallas    = tallaOptions.filter(t => getGeneroTalla(t) === 'H');
  const mTallas    = tallaOptions.filter(t => getGeneroTalla(t) === 'M');
  const otraTallas = tallaOptions.filter(t => getGeneroTalla(t) === 'other');

  function set(field: keyof Player, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function handleAdd() {
    if (!form.NOMBRE.trim()) return;
    if (!form.TALLA.trim()) return;
    addPlayer({ ...form, NOMBRE: form.NOMBRE.trim(), NOMBRE_CAMISETA: form.NOMBRE_CAMISETA.trim(), NUMERO: form.NUMERO.trim(), TALLA: form.TALLA.trim().toUpperCase() });
    setForm({ ...EMPTY });
  }

  if (!open) {
    return (
      <div className="add-player-bar">
        <button className="btn btn-primary btn-sm" onClick={() => setOpen(true)}>
          + AGREGAR JUGADOR
        </button>
      </div>
    );
  }

  return (
    <div className="add-player-form">
      <div className="add-player-form-title">NUEVO JUGADOR</div>
      <div className="add-player-fields">
        <div className="add-player-field">
          <label>NOMBRE *</label>
          <input
            className="input-player"
            type="text"
            placeholder="García López"
            value={form.NOMBRE}
            onChange={e => set('NOMBRE', e.target.value)}
          />
        </div>
        <div className="add-player-field">
          <label>NOMBRE CAMISETA</label>
          <input
            className="input-player"
            type="text"
            placeholder="GARCIA"
            value={form.NOMBRE_CAMISETA}
            onChange={e => set('NOMBRE_CAMISETA', e.target.value)}
          />
        </div>
        <div className="add-player-field add-player-field--sm">
          <label>NÚMERO</label>
          <input
            className="input-player"
            type="text"
            placeholder="10"
            maxLength={3}
            value={form.NUMERO}
            onChange={e => set('NUMERO', e.target.value)}
          />
        </div>
        <div className="add-player-field add-player-field--sm">
          <label>TALLA *</label>
          <select
            className="input-player"
            value={form.TALLA}
            onChange={e => set('TALLA', e.target.value)}
          >
            <option value="">— elegir —</option>
            {hTallas.length > 0 && <optgroup label="♂ HOMBRES" style={{ color: '#4A9BE8' }}>{hTallas.map(t => <option key={t} value={t}>{t}</option>)}</optgroup>}
            {mTallas.length > 0 && <optgroup label="♀ MUJERES" style={{ color: '#F050A0' }}>{mTallas.map(t => <option key={t} value={t}>{t}</option>)}</optgroup>}
            {otraTallas.length > 0 && <optgroup label="OTROS">{otraTallas.map(t => <option key={t} value={t}>{t}</option>)}</optgroup>}
          </select>
        </div>
      </div>
      <div className="add-player-actions">
        <button
          className="btn btn-primary btn-sm"
          onClick={handleAdd}
          disabled={!form.NOMBRE.trim() || !form.TALLA.trim()}
        >
          AGREGAR
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => { setOpen(false); setForm({ ...EMPTY }); }}>
          CANCELAR
        </button>
      </div>
    </div>
  );
}
