import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import {
  DEPARTMENTS,
  CREATE_DEPARTMENT,
  UPDATE_DEPARTMENT,
  REMOVE_DEPARTMENT,
} from '../graphql/operations';
import { PageHeader, Skeleton, Modal, EmptyState, Spinner } from '../components/ui';
import { alerts } from '../lib/alerts';
import { useAuth } from '../context/AuthContext';
import type { Department } from '../types';

const empty = { name: '', code: '', location: '', isActive: true };

export default function Departments() {
  const { hasRole } = useAuth();
  const canManage = hasRole('ADMIN');
  const { data, loading, refetch } = useQuery<{ departments: Department[] }>(
    DEPARTMENTS,
  );
  const [create, { loading: creating }] = useMutation(CREATE_DEPARTMENT);
  const [update, { loading: updating }] = useMutation(UPDATE_DEPARTMENT);
  const [remove] = useMutation(REMOVE_DEPARTMENT);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [form, setForm] = useState(empty);

  const openCreate = () => {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };
  const openEdit = (d: Department) => {
    setEditing(d);
    setForm({
      name: d.name,
      code: d.code,
      location: d.location ?? '',
      isActive: d.isActive,
    });
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const input = {
        name: form.name,
        code: form.code,
        location: form.location || undefined,
        isActive: form.isActive,
      };
      if (editing) {
        await update({ variables: { input: { id: Number(editing.id), ...input } } });
        alerts.success('Departamento actualizado');
      } else {
        await create({ variables: { input } });
        alerts.success('Departamento creado');
      }
      setOpen(false);
      refetch();
    } catch (err: any) {
      alerts.error('Error al guardar', err?.message);
    }
  };

  const del = async (d: Department) => {
    if (!(await alerts.confirm('Eliminar departamento', d.name))) return;
    try {
      await remove({ variables: { id: Number(d.id) } });
      alerts.success('Eliminado');
      refetch();
    } catch (err: any) {
      alerts.error('No se pudo eliminar', err?.message);
    }
  };

  return (
    <div>
      <PageHeader
        title="Departamentos"
        subtitle="Areas y ubicaciones institucionales"
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
              <th className="px-4 py-3">Codigo</th>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Ubicacion</th>
              <th className="px-4 py-3">Estado</th>
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
            ) : data?.departments.length ? (
              data.departments.map((d) => (
                <tr key={d.id} className="table-row-hover">
                  <td className="px-4 py-3 font-mono text-xs">{d.code}</td>
                  <td className="px-4 py-3 font-medium">{d.name}</td>
                  <td className="px-4 py-3">{d.location ?? '-'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        d.isActive
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                          : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {d.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  {canManage && (
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => openEdit(d)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-950/40"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => del(d)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30"
                        >
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
                  <EmptyState message="Sin departamentos" />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Editar departamento' : 'Nuevo departamento'}>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Nombre *</label>
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Codigo *</label>
            <input className="input" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          </div>
          <div>
            <label className="label">Ubicacion</label>
            <input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
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
