import { useMemo, useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  History,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import {
  ASSETS,
  CATALOGS,
  CREATE_ASSET,
  UPDATE_ASSET,
  REMOVE_ASSET,
  ASSET_MOVEMENTS,
} from '../graphql/operations';
import {
  PageHeader,
  Skeleton,
  Modal,
  StatusBadge,
  EmptyState,
  Spinner,
} from '../components/ui';
import { alerts } from '../lib/alerts';
import { useAuth } from '../context/AuthContext';
import {
  ASSET_STATUS_LABELS,
  type Asset,
  type AssetPage,
  type AssetStatus,
  type Category,
  type Department,
  type Responsable,
  type AssetMovement,
} from '../types';

const STATUS_OPTIONS = Object.keys(ASSET_STATUS_LABELS) as AssetStatus[];

const emptyForm = {
  code: '',
  description: '',
  brand: '',
  model: '',
  serialNumber: '',
  value: 0,
  purchaseDate: '',
  status: 'ACTIVO' as AssetStatus,
  observations: '',
  categoryId: '',
  departmentId: '',
  responsableId: '',
};

export default function Assets() {
  const { hasRole } = useAuth();
  const canEdit = hasRole('ADMIN', 'SUPERVISOR');
  const canManage = hasRole('ADMIN');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [historyAsset, setHistoryAsset] = useState<Asset | null>(null);

  const filter = useMemo(
    () => ({
      search: search || undefined,
      status: statusFilter || undefined,
      page,
      limit: 10,
    }),
    [search, statusFilter, page],
  );

  const { data, loading, refetch } = useQuery<{ assets: AssetPage }>(ASSETS, {
    variables: { filter },
  });
  const { data: catalogs } = useQuery<{
    departments: Department[];
    categories: Category[];
    responsables: Responsable[];
  }>(CATALOGS);

  const [createAsset, { loading: creating }] = useMutation(CREATE_ASSET);
  const [updateAsset, { loading: updating }] = useMutation(UPDATE_ASSET);
  const [removeAsset] = useMutation(REMOVE_ASSET);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (asset: Asset) => {
    setEditing(asset);
    setForm({
      code: asset.code,
      description: asset.description,
      brand: asset.brand ?? '',
      model: asset.model ?? '',
      serialNumber: asset.serialNumber ?? '',
      value: asset.value,
      purchaseDate: asset.purchaseDate
        ? asset.purchaseDate.substring(0, 10)
        : '',
      status: asset.status,
      observations: asset.observations ?? '',
      categoryId: asset.category?.id ?? '',
      departmentId: asset.department?.id ?? '',
      responsableId: asset.responsable?.id ?? '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const base = {
      description: form.description,
      brand: form.brand || undefined,
      model: form.model || undefined,
      serialNumber: form.serialNumber || undefined,
      value: Number(form.value) || 0,
      purchaseDate: form.purchaseDate || undefined,
      status: form.status,
      observations: form.observations || undefined,
      categoryId: form.categoryId ? Number(form.categoryId) : undefined,
      departmentId: form.departmentId ? Number(form.departmentId) : undefined,
      responsableId: form.responsableId
        ? Number(form.responsableId)
        : undefined,
    };
    try {
      if (editing) {
        await updateAsset({
          variables: { input: { id: Number(editing.id), ...base } },
        });
        alerts.success('Bien actualizado');
      } else {
        await createAsset({
          variables: { input: { code: form.code, ...base } },
        });
        alerts.success('Bien registrado');
      }
      setModalOpen(false);
      refetch();
    } catch (err: any) {
      alerts.error('Error al guardar', err?.message);
    }
  };

  const handleDelete = async (asset: Asset) => {
    const ok = await alerts.confirm(
      'Eliminar bien',
      `Se eliminara "${asset.description}" (${asset.code}). Esta accion es irreversible.`,
    );
    if (!ok) return;
    try {
      await removeAsset({ variables: { id: Number(asset.id) } });
      alerts.success('Bien eliminado');
      refetch();
    } catch (err: any) {
      alerts.error('No se pudo eliminar', err?.message);
    }
  };

  const result = data?.assets;

  return (
    <div>
      <PageHeader
        title="Bienes"
        subtitle="Inventario de activos institucionales"
        actions={
          canManage ? (
            <button className="btn-primary" onClick={openCreate}>
              <Plus size={16} /> Nuevo bien
            </button>
          ) : undefined
        }
      />

      <div className="card mb-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            className="input pl-10"
            placeholder="Buscar por codigo, descripcion o serie..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="relative sm:w-56">
          <Filter size={18} className="absolute left-3 top-2.5 text-slate-400" />
          <select
            className="input pl-10"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos los estados</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {ASSET_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="table-header">
              <tr>
                <th className="px-4 py-3">Codigo</th>
                <th className="px-4 py-3">Descripcion</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3">Departamento</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading && !result ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3" colSpan={7}>
                      <Skeleton className="h-6 w-full" />
                    </td>
                  </tr>
                ))
              ) : result?.items.length ? (
                result.items.map((asset) => (
                  <tr
                    key={asset.id}
                    className="table-row-hover"
                  >
                    <td className="px-4 py-3 font-mono text-xs">{asset.code}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{asset.description}</p>
                      <p className="text-xs text-slate-400">
                        {asset.brand} {asset.model}
                      </p>
                    </td>
                    <td className="px-4 py-3">{asset.category?.name ?? '-'}</td>
                    <td className="px-4 py-3">
                      {asset.department?.name ?? '-'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={asset.status} />
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {new Intl.NumberFormat('es-MX', {
                        style: 'currency',
                        currency: 'MXN',
                      }).format(asset.value)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => setHistoryAsset(asset)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-950/40"
                          title="Historial"
                        >
                          <History size={16} />
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => openEdit(asset)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-950/40"
                            title="Editar"
                          >
                            <Pencil size={16} />
                          </button>
                        )}
                        {canManage && (
                          <button
                            onClick={() => handleDelete(asset)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30"
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7}>
                    <EmptyState message="No se encontraron bienes" />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {result && result.totalPages > 0 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm dark:border-slate-800">
            <p className="text-slate-500 dark:text-slate-400">
              {result.total} bienes - Pagina {result.page} de{' '}
              {result.totalPages}
            </p>
            <div className="flex gap-2">
              <button
                className="btn-secondary px-2 py-1.5"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                className="btn-secondary px-2 py-1.5"
                disabled={page >= result.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar bien' : 'Nuevo bien'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Codigo *</label>
            <input
              className="input"
              required
              disabled={!!editing}
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Estado</label>
            <select
              className="input"
              value={form.status}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value as AssetStatus })
              }
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {ASSET_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Descripcion *</label>
            <input
              className="input"
              required
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </div>
          <div>
            <label className="label">Marca</label>
            <input
              className="input"
              value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Modelo</label>
            <input
              className="input"
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Numero de serie</label>
            <input
              className="input"
              value={form.serialNumber}
              onChange={(e) =>
                setForm({ ...form, serialNumber: e.target.value })
              }
            />
          </div>
          <div>
            <label className="label">Valor</label>
            <input
              type="number"
              step="0.01"
              className="input"
              value={form.value}
              onChange={(e) =>
                setForm({ ...form, value: Number(e.target.value) })
              }
            />
          </div>
          <div>
            <label className="label">Fecha de compra</label>
            <input
              type="date"
              className="input"
              value={form.purchaseDate}
              onChange={(e) =>
                setForm({ ...form, purchaseDate: e.target.value })
              }
            />
          </div>
          <div>
            <label className="label">Categoria</label>
            <select
              className="input"
              value={form.categoryId}
              onChange={(e) =>
                setForm({ ...form, categoryId: e.target.value })
              }
            >
              <option value="">Sin categoria</option>
              {catalogs?.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Departamento</label>
            <select
              className="input"
              value={form.departmentId}
              onChange={(e) =>
                setForm({ ...form, departmentId: e.target.value })
              }
            >
              <option value="">Sin asignar</option>
              {catalogs?.departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Responsable</label>
            <select
              className="input"
              value={form.responsableId}
              onChange={(e) =>
                setForm({ ...form, responsableId: e.target.value })
              }
            >
              <option value="">Sin responsable</option>
              {catalogs?.responsables.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.fullName}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Observaciones</label>
            <textarea
              className="input"
              rows={2}
              value={form.observations}
              onChange={(e) =>
                setForm({ ...form, observations: e.target.value })
              }
            />
          </div>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setModalOpen(false)}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={creating || updating}
            >
              {creating || updating ? <Spinner /> : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>

      <HistoryModal
        asset={historyAsset}
        onClose={() => setHistoryAsset(null)}
      />
    </div>
  );
}

function HistoryModal({
  asset,
  onClose,
}: {
  asset: Asset | null;
  onClose: () => void;
}) {
  const { data, loading } = useQuery<{ assetMovements: AssetMovement[] }>(
    ASSET_MOVEMENTS,
    {
      variables: { assetId: asset?.id },
      skip: !asset,
    },
  );

  return (
    <Modal
      open={!!asset}
      onClose={onClose}
      title={`Historial - ${asset?.code ?? ''}`}
      size="lg"
    >
      {loading ? (
        <Skeleton className="h-40" />
      ) : data?.assetMovements.length ? (
        <ul className="space-y-3">
          {data.assetMovements.map((m) => (
            <li
              key={m.id}
              className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700"
            >
              <p className="font-medium capitalize">{m.field}</p>
              <p className="text-slate-500 dark:text-slate-400">
                <span className="text-red-500 line-through">
                  {m.oldValue || '-'}
                </span>{' '}
                &rarr;{' '}
                <span className="text-emerald-500">{m.newValue || '-'}</span>
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {m.user?.fullName ?? 'Sistema'} -{' '}
                {new Date(m.createdAt).toLocaleString('es-MX')}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState message="Sin cambios registrados" />
      )}
    </Modal>
  );
}
