// ============================================================
//  modules/settings/ClientesTab.tsx — CRUD de clientes
// ============================================================
import { useState } from 'react';
import { useClientesStore } from '../../store/useClientesStore';
import { useTallasStore } from '../../store/useTallasStore';
import { MOLDE_DEFAULT_ID } from '../../store/useMoldesStore';
import { ConfirmButton } from '../../components/ui/ConfirmButton';

interface Props {
  onToast: (msg: string, type: 'ok' | 'error') => void;
}

const EMPTY = { nombre: '', casaCosturera: '' };

export function ClientesTab({ onToast }: Props) {
  const { clientes, addCliente, updateCliente, removeCliente } = useClientesStore();
  const { initClienteFromDefault, removeCliente: removeTallasCliente } = useTallasStore();

  const [form, setForm]         = useState({ ...EMPTY });
  const [editId, setEditId]     = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ ...EMPTY });

  function handleAdd() {
    if (!form.nombre.trim()) return;
    const id = addCliente(form.nombre, form.casaCosturera);
    initClienteFromDefault(id, MOLDE_DEFAULT_ID);
    setForm({ ...EMPTY });
    onToast(`Cliente "${form.nombre.trim()}" creado con tallas por defecto`, 'ok');
  }

  function handleEditSave(id: string) {
    if (!editForm.nombre.trim()) return;
    updateCliente(id, { nombre: editForm.nombre.trim(), casaCosturera: editForm.casaCosturera.trim() });
    setEditId(null);
    onToast('Cliente actualizado', 'ok');
  }

  function handleDelete(id: string, nombre: string) {
    if (!confirm(`¿Eliminar cliente "${nombre}"? Se eliminarán también sus tallas.`)) return;
    removeCliente(id);
    removeTallasCliente(id);
    onToast(`Cliente "${nombre}" eliminado`, 'ok');
  }

  return (
    <div className="clientes-tab">

      {/* ── Formulario nuevo cliente ── */}
      <div className="tallas-toolbar">
        <div className="tallas-add">
          <input
            className="input-talla-nueva"
            type="text"
            placeholder="Nombre del cliente *"
            value={form.nombre}
            onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <input
            className="input-talla-nueva"
            type="text"
            placeholder="Casa costurera (opcional)"
            value={form.casaCosturera}
            onChange={e => setForm(f => ({ ...f, casaCosturera: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <button
            className="btn btn-primary btn-sm"
            onClick={handleAdd}
            disabled={!form.nombre.trim()}
          >
            + AGREGAR
          </button>
        </div>
      </div>

      {/* ── Tabla de clientes ── */}
      <div className="tallas-table-wrap">
        <table className="tallas-table">
          <thead>
            <tr>
              <th className="col-cliente-nombre">NOMBRE</th>
              <th className="col-cliente-casa">CASA COSTURERA</th>
              <th className="col-del"></th>
            </tr>
          </thead>
          <tbody>
            {clientes.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', padding: '16px', color: '#888', fontSize: '12px' }}>
                  Sin clientes registrados — agregá uno arriba
                </td>
              </tr>
            ) : clientes.map(c => (
              <tr key={c.id}>
                {editId === c.id ? (
                  <>
                    <td className="col-cliente-nombre">
                      <input
                        className="input-dim"
                        type="text"
                        value={editForm.nombre}
                        onChange={e => setEditForm(f => ({ ...f, nombre: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && handleEditSave(c.id)}
                        autoFocus
                      />
                    </td>
                    <td className="col-cliente-casa">
                      <input
                        className="input-dim"
                        type="text"
                        value={editForm.casaCosturera}
                        onChange={e => setEditForm(f => ({ ...f, casaCosturera: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && handleEditSave(c.id)}
                      />
                    </td>
                    <td className="col-del col-cliente-actions">
                      <button className="btn-del-talla" title="Guardar" onClick={() => handleEditSave(c.id)}>✓</button>
                      <button className="btn-del-talla" title="Cancelar" onClick={() => setEditId(null)}>✕</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="col-cliente-nombre">
                      <span className="cliente-nombre-cell">{c.nombre}</span>
                    </td>
                    <td className="col-cliente-casa">
                      <span className="cliente-casa-cell">{c.casaCosturera || '—'}</span>
                    </td>
                    <td className="col-del col-cliente-actions">
                      <button
                        className="btn-del-talla"
                        title="Editar"
                        onClick={() => { setEditId(c.id); setEditForm({ nombre: c.nombre, casaCosturera: c.casaCosturera }); }}
                      >
                        ✎
                      </button>
                      <ConfirmButton
                        className="btn-del-talla btn-del-danger"
                        title="Eliminar"
                        onConfirm={() => handleDelete(c.id, c.nombre)}
                      />
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {clientes.length > 0 && (
        <p className="tallas-hint">
          {clientes.length} cliente{clientes.length !== 1 ? 's' : ''} registrado{clientes.length !== 1 ? 's' : ''}.
          Las tallas se configuran en la pestaña <strong>TALLAS</strong>.
        </p>
      )}
    </div>
  );
}
