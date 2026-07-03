import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import {
  USERS,
  CREATE_USER,
  UPDATE_USER,
  REMOVE_USER,
} from '../graphql/operations';
import { PageHeader, Skeleton, Modal, EmptyState, Spinner } from '../components/ui';
import { alerts } from '../lib/alerts';
import type { Role, User } from '../types';

const empty = { fullName: '', email: '', password: '', roleId: '', isActive: true };

export default function UsersPage() {
  const { data, loading, refetch } = useQuery<{ users: User[]; roles: Role[] }>(
    USERS,
  );
  const [create, { loading: creating }] = useMutation(CREATE_USER);
  const [update, { loading: updating }] = useMutation(UPDATE_USER);
  const [remove] = useMutation(REMOVE_USER);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState(empty);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...empty, roleId: data?.roles[0]?.id ?? '' });
    setOpen(true);
  };
  const openEdit = (u: User) => {
    setEditing(u);
    setForm({
      fullName: u.fullName,
      email: u.email,
      password: '',
      roleId: u.role.id,
      isActive: u.isActive,
    });
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        const input: any = {
          id: Number(editing.id),
          fullName: form.fullName,
          email: form.email,
          roleId: Number(form.roleId),
          isActive: form.isActive,
        };
        if (form.password) input.password = form.password;
        await update({ variables: { input } });
        alerts.success('Usuario actualizado');
      } else {
        await create({
          variables: {
            input: {
              fullName: form.fullName,
              email: form.email,
              password: form.password,
              roleId: Number(form.roleId),
              isActive: form.isActive,
            },
          },
        });
        alerts.success('Usuario creado');
      }
      setOpen(false);
      refetch();
    } catch (err: any) {
      alerts.error('Error al guardar', err?.message);
    }
  };

  const del = async (u: User) => {
    if (!(await alerts.confirm('Eliminar usuario', u.email))) return;
    try {
      await remove({ variables: { id: Number(u.id) } });
      alerts.success('Eliminado');
      refetch();
    } catch (err: any) {
      alerts.error('No se pudo eliminar', err?.message);
    }
  };

  return (
    <div>
      <PageHeader
        title="Usuarios"
        subtitle="Gestion de cuentas y roles de acceso"
        actions={
          <button className="btn-primary" onClick={openCreate}>
            <Plus size={16} /> Nuevo
          </button>
        }
      />
      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="table-header">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Correo</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Ultimo acceso</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-3">
                  <Skeleton className="h-6 w-full" />
                </td>
              </tr>
            ) : data?.users.length ? (
              data.users.map((u) => (
                <tr key={u.id} className="table-row-hover">
                  <td className="px-4 py-3 font-medium">{u.fullName}</td>
                  <td className="px-4 py-3 text-slate-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700 dark:bg-brand-900 dark:text-brand-300">
                      {u.role.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {u.lastLoginAt
                      ? new Date(u.lastLoginAt).toLocaleString('es-MX')
                      : 'Nunca'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        u.isActive
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                          : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {u.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(u)} className="rounded-lg p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-950/40">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => del(u)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6}>
                  <EmptyState message="Sin usuarios" />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Editar usuario' : 'Nuevo usuario'}>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Nombre completo *</label>
            <input className="input" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </div>
          <div>
            <label className="label">Correo *</label>
            <input type="email" className="input" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="label">
              {editing ? 'Nueva contrasena (opcional)' : 'Contrasena *'}
            </label>
            <input type="password" className="input" required={!editing} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div>
            <label className="label">Rol *</label>
            <select className="input" required value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })}>
              <option value="">Selecciona...</option>
              {data?.roles.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
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
