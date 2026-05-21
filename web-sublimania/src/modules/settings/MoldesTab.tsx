// ============================================================
//  modules/settings/MoldesTab.tsx — CRUD de tipos de molde
// ============================================================
import { useState } from 'react';
import { useMoldesStore } from '../../store/useMoldesStore';
import { useTallasStore } from '../../store/useTallasStore';
import { ConfirmButton } from '../../components/ui/ConfirmButton';

interface Props {
  onToast: (msg: string, type: 'ok' | 'error') => void;
}

export function MoldesTab({ onToast }: Props) {
  const { moldes, addMolde, renameMolde, removeMolde, setTipo } = useMoldesStore();
  const { removeMoldeData } = useTallasStore();

  const [newNombre, setNewNombre] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNombre, setEditingNombre] = useState('');

  function handleAdd() {
    const n = newNombre.trim();
    if (!n) return;
    if (moldes.some(m => m.nombre === n.toUpperCase())) {
      onToast('Ya existe un molde con ese nombre', 'error');
      return;
    }
    addMolde(n);
    setNewNombre('');
    onToast(`Molde "${n.toUpperCase()}" creado`, 'ok');
  }

  function handleRename(id: string) {
    const n = editingNombre.trim();
    if (!n) return;
    renameMolde(id, n);
    setEditingId(null);
    onToast('Molde renombrado', 'ok');
  }

  function handleRemove(id: string, nombre: string) {
    removeMolde(id);
    removeMoldeData(id);
    onToast(`Molde "${nombre}" eliminado`, 'ok');
  }

  return (
    <div className="moldes-tab">
      <div className="moldes-toolbar">
        <input
          className="input-talla-nueva"
          type="text"
          placeholder="NUEVO MOLDE (EJ: PANTALONETA)"
          value={newNombre}
          maxLength={30}
          onChange={e => setNewNombre(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <button className="btn btn-primary btn-sm" onClick={handleAdd}>
          + AGREGAR
        </button>
      </div>

      <div className="moldes-list">
        {moldes.map(m => (
          <div key={m.id} className="molde-row">
            {editingId === m.id ? (
              <>
                <input
                  className="molde-rename-input"
                  value={editingNombre}
                  autoFocus
                  onChange={e => setEditingNombre(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleRename(m.id);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                />
                <button className="btn btn-primary btn-sm" onClick={() => handleRename(m.id)}>✓</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)}>✕</button>
              </>
            ) : (
              <>
                <span className="molde-nombre">{m.nombre}</span>
                <select
                  className="molde-tipo-select"
                  value={m.tipo}
                  onChange={e => setTipo(m.id, e.target.value as 'camiseta' | 'pantaloneta')}
                >
                  <option value="camiseta">CAMISETA</option>
                  <option value="pantaloneta">PANTALONETA</option>
                </select>
                <div className="molde-actions">
                  <button
                    className="btn btn-ghost btn-sm"
                    aria-label={`Renombrar ${m.nombre}`}
                    onClick={() => { setEditingId(m.id); setEditingNombre(m.nombre); }}
                  >
                    ✎ RENOMBRAR
                  </button>
                  {moldes.length > 1 && (
                    <ConfirmButton
                      className="btn btn-ghost btn-sm btn-danger"
                      title={`Eliminar ${m.nombre} y todas sus tallas`}
                      onConfirm={() => handleRemove(m.id, m.nombre)}
                    />
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <p className="moldes-hint">
        {moldes.length} molde{moldes.length !== 1 ? 's' : ''} definido{moldes.length !== 1 ? 's' : ''}.
        Cada molde tiene su propio set de tallas por cliente.
        Eliminar un molde borra todas sus dimensiones.
      </p>
    </div>
  );
}
