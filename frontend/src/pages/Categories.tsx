import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import {
  CATEGORIES,
  CREATE_CATEGORY,
  UPDATE_CATEGORY,
  REMOVE_CATEGORY,
} from '../graphql/operations';
import { PageHeader, Skeleton, Modal, EmptyState, Spinner } from '../components/ui';
import { alerts } from '../lib/alerts';
import { useAuth } from '../context/AuthContext';
import type { Category } from '../types';

const empty = { name: '', description: '', depreciationRate: 0 };

export default function Categories() {
  const { hasRole } = useAuth();
  const canManage = hasRole('ADMIN');
  const { data, loading, refetch } = useQuery<{ categories: Category[] }>(
    CATEGORIES,
  );
  const [create, { loading: creating }] = useMutation(CREATE_CATEGORY);
  const [update, { loading: updating }] = useMutation(UPDATE_CATEGORY);
  const [remove] = useMutation(REMOVE_CATEGORY);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState(empty);

  const openCreate = () => {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };
  const openEdit = (c: Category) => {
    setEditing(c);
    setForm({
      name: c.name,
      description: c.description ?? '',
      depreciationRate: c.depreciationRate,
    });
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const input = {
        name: form.name,
        description: form.description || undefined,
        depreciationRate: Number(form.depreciationRate) || 0,
      };
      if (editing) {
        await update({ variables: { input: { id: Number(editing.id), ...input } } });
        alerts.success('Categoria actualizada');
      } else {
        await create({ variables: { input } });
        alerts.success('Categoria creada');
      }
      setOpen(false);
      refetch();
    } catch (err: any) {
      alerts.error('Error al guardar', err?.message);
    }
  };

  const del = async (c: Category) => {
    if (!(await alerts.confirm('Eliminar categoria', c.name))) return;
    try {
      await remove({ variables: { id: Number(c.id) } });
      alerts.success('Eliminada');
      refetch();
    } catch (err: any) {
      alerts.error('No se pudo eliminar', err?.message);
    }
  };

  return (
    <div>
      <PageHeader
        title="Categorias"
        subtitle="Clasificacion de bienes y tasa de depreciacion"
        actions={
          canManage ? (
            <button className="btn-primary" onClick={openCreate}>
              <Plus size={16} /> Nueva
            </button>
          ) : undefined
        }
      />
      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="table-header">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Descripcion</th>
              <th className="px-4 py-3 text-right">Depreciacion (%)</th>
              {canManage && <th className="px-4 py-3 text-right">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-3">
                  <Skeleton className="h-6 w-full" />
                </td>
              </tr>
            ) : data?.categories.length ? (
              data.categories.map((c) => (
                <tr key={c.id} className="table-row-hover">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-slate-500">{c.description ?? '-'}</td>
                  <td className="px-4 py-3 text-right">{c.depreciationRate}%</td>
                  {canManage && (
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(c)} className="rounded-lg p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-950/40">
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => del(c)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4}>
                  <EmptyState message="Sin categorias" />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Editar categoria' : 'Nueva categoria'}>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Nombre *</label>
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Descripcion</label>
            <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="label">Tasa de depreciacion anual (%)</label>
            <input type="number" step="0.01" className="input" value={form.depreciationRate} onChange={(e) => setForm({ ...form, depreciationRate: Number(e.target.value) })} />
          </div>
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
