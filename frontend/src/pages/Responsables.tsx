import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import {
  RESPONSABLES,
  CREATE_RESPONSABLE,
  UPDATE_RESPONSABLE,
  REMOVE_RESPONSABLE,
} from '../graphql/operations';
import { PageHeader, Skeleton, Modal, EmptyState, Spinner } from '../components/ui';
import { alerts } from '../lib/alerts';
import { useAuth } from '../context/AuthContext';
import type { Responsable } from '../types';

const empty = { fullName: '', email: '', phone: '', position: '', isActive: true };

export default function Responsables() {
  const { hasRole } = useAuth();
  const canManage = hasRole('ADMIN', 'SUPERVISOR');
  const { data, loading, refetch } = useQuery<{ responsables: Responsable[] }>(
    RESPONSABLES,
  );
  const [create, { loading: creating }] = useMutation(CREATE_RESPONSABLE);
  const [update, { loading: updating }] = useMutation(UPDATE_RESPONSABLE);
  const [remove] = useMutation(REMOVE_RESPONSABLE);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Responsable | null>(null);
  const [form, setForm] = useState(empty);

  const openCreate = () => {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };
  const openEdit = (r: Responsable) => {
    setEditing(r);
    setForm({
      fullName: r.fullName,
      email: r.email ?? '',
      phone: r.phone ?? '',
      position: r.position ?? '',
      isActive: r.isActive,
    });
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const input = {
        fullName: form.fullName,
        email: form.email || undefined,
        phone: form.phone || undefined,
        position: form.position || undefined,
        isActive: form.isActive,
      };
      if (editing) {
        await update({ variables: { input: { id: Number(editing.id), ...input } } });
        alerts.success('Responsable actualizado');
      } else {
        await create({ variables: { input } });
        alerts.success('Responsable creado');
      }
      setOpen(false);
      refetch();
    } catch (err: any) {
      alerts.error('Error al guardar', err?.message);
    }
  };

  const del = async (r: Responsable) => {
    if (!(await alerts.confirm('Eliminar responsable', r.fullName))) return;
    try {
      await remove({ variables: { id: Number(r.id) } });
      alerts.success('Eliminado');
      refetch();
    } catch (err: any) {
      alerts.error('No se pudo eliminar', err?.message);
    }
  };

  return (
    <div>
      <PageHeader
        title="Responsables"
        subtitle="Personas a cargo de los bienes"
        actions={
          canManage ? (
            <button className="btn-primary" onClick={openCreate}>
              <Plus size={16} /> Nuevo
            </button>
          ) : undefined
        }
      />
      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="table-header">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Puesto</th>
              <th className="px-4 py-3">Correo</th>
              <th className="px-4 py-3">Telefono</th>
              {canManage && <th className="px-4 py-3 text-right">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-3">
                  <Skeleton className="h-6 w-full" />
                </td>
              </tr>
            ) : data?.responsables.length ? (
              data.responsables.map((r) => (
                <tr key={r.id} className="table-row-hover">
                  <td className="px-4 py-3 font-medium">{r.fullName}</td>
                  <td className="px-4 py-3">{r.position ?? '-'}</td>
                  <td className="px-4 py-3 text-slate-500">{r.email ?? '-'}</td>
                  <td className="px-4 py-3">{r.phone ?? '-'}</td>
                  {canManage && (
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(r)} className="rounded-lg p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-950/40">
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => del(r)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5}>
                  <EmptyState message="Sin responsables" />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Editar responsable' : 'Nuevo responsable'}>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Nombre completo *</label>
            <input className="input" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </div>
          <div>
            <label className="label">Puesto</label>
            <input className="input" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
          </div>
          <div>
            <label className="label">Correo</label>
            <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="label">Telefono</label>
            <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
            Activo
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={creating || updating}>
              {creating || updating ? <Spinner /> : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
