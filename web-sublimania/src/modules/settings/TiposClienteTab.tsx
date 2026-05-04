import { useState } from 'react';
import { useTiposClienteStore } from '../../store/useTiposClienteStore';
import { ConfirmButton } from '../../components/ui/ConfirmButton';
import type { CustomerSegment } from '../../pricing/types';

interface Props {
  onToast: (msg: string, type: 'ok' | 'error') => void;
}

export function TiposClienteTab({ onToast }: Props) {
  const { tipos, addTipo, updateTipo, removeTipo } = useTiposClienteStore();

  const [newNombre, setNewNombre]       = useState('');
  const [newSegmento, setNewSegmento]   = useState<CustomerSegment>('normal');
  const [editingId, setEditingId]       = useState<string | null>(null);
  const [editNombre, setEditNombre]     = useState('');
  const [editSegmento, setEditSegmento] = useState<CustomerSegment>('normal');

  function handleAdd() {
    const n = newNombre.trim().toUpperCase();
    if (!n) return;
    if (tipos.some(t => t.nombre === n)) {
      onToast('Ya existe un tipo con ese nombre', 'error');
      return;
    }
    addTipo(n, newSegmento);
    setNewNombre('');
    onToast(`Tipo "${n}" creado`, 'ok');
  }

  function handleEdit(id: string) {
    const n = editNombre.trim().toUpperCase();
    if (!n) return;
    updateTipo(id, { nombre: n, segmento: editSegmento });
    setEditingId(null);
    onToast('Tipo actualizado', 'ok');
  }

  function handleRemove(id: string, nombre: string) {
    if (tipos.length <= 1) {
      onToast('Debe quedar al menos un tipo de cliente', 'error');
      return;
    }
    removeTipo(id);
    onToast(`Tipo "${nombre}" eliminado`, 'ok');
  }

  return (
    <div className="moldes-tab">
      <div className="moldes-toolbar tipos-toolbar">
        <input
          className="input-talla-nueva"
          type="text"
          placeholder="NUEVO TIPO (EJ: MAYORISTA)"
          value={newNombre}
          maxLength={30}
          onChange={e => setNewNombre(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <select
          className="input-talla-nueva tipos-segmento-select"
          value={newSegmento}
          onChange={e => setNewSegmento(e.target.value as CustomerSegment)}
        >
          <option value="normal">NORMAL</option>
          <option value="vip">VIP</option>
        </select>
        <button className="btn btn-primary btn-sm" onClick={handleAdd}>
          + AGREGAR
        </button>
      </div>

      <div className="moldes-list">
        {tipos.map(t => (
          <div key={t.id} className="molde-row">
            {editingId === t.id ? (
              <>
                <input
                  className="molde-rename-input"
                  value={editNombre}
                  autoFocus
                  onChange={e => setEditNombre(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleEdit(t.id);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                />
                <select
                  className="input-talla-nueva tipos-segmento-select"
                  value={editSegmento}
                  onChange={e => setEditSegmento(e.target.value as CustomerSegment)}
                >
                  <option value="normal">NORMAL</option>
                  <option value="vip">VIP</option>
                </select>
                <button className="btn btn-primary btn-sm" onClick={() => handleEdit(t.id)}>✓</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)}>✕</button>
              </>
            ) : (
              <>
                <span className="molde-nombre">{t.nombre}</span>
                <span className={`tipos-segmento-badge ${t.segmento === 'vip' ? 'tipos-segmento-vip' : 'tipos-segmento-normal'}`}>
                  {t.segmento.toUpperCase()}
                </span>
                <div className="molde-actions">
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => { setEditingId(t.id); setEditNombre(t.nombre); setEditSegmento(t.segmento); }}
                  >
                    ✎ EDITAR
                  </button>
                  {tipos.length > 1 && (
                    <ConfirmButton
                      className="btn btn-ghost btn-sm btn-danger"
                      title="Eliminar tipo"
                      onConfirm={() => handleRemove(t.id, t.nombre)}
                    />
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <p className="moldes-hint">
        {tipos.length} tipo{tipos.length !== 1 ? 's' : ''} definido{tipos.length !== 1 ? 's' : ''}.
        Cada tipo mapea a un segmento de precios (NORMAL o VIP).
      </p>
    </div>
  );
}
