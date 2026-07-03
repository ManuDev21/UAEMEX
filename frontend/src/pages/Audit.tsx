import { useQuery } from '@apollo/client';
import {
  LogIn,
  LogOut,
  Plus,
  Pencil,
  Trash2,
  Upload,
  Download,
  Activity,
} from 'lucide-react';
import { AUDIT_LOGS } from '../graphql/operations';
import { PageHeader, Skeleton, EmptyState } from '../components/ui';
import type { AuditLog } from '../types';

const ACTION_META: Record<
  string,
  { icon: typeof Activity; color: string; label: string }
> = {
  LOGIN: { icon: LogIn, color: 'text-emerald-600', label: 'Inicio de sesion' },
  LOGOUT: { icon: LogOut, color: 'text-slate-500', label: 'Cierre de sesion' },
  CREATE: { icon: Plus, color: 'text-brand-600', label: 'Creacion' },
  UPDATE: { icon: Pencil, color: 'text-amber-600', label: 'Actualizacion' },
  DELETE: { icon: Trash2, color: 'text-red-600', label: 'Eliminacion' },
  IMPORT: { icon: Upload, color: 'text-brand-600', label: 'Importacion' },
  EXPORT: { icon: Download, color: 'text-gold-600', label: 'Exportacion' },
};

export default function Audit() {
  const { data, loading } = useQuery<{ auditLogs: AuditLog[] }>(AUDIT_LOGS, {
    variables: { limit: 200 },
  });

  return (
    <div>
      <PageHeader
        title="Auditoria"
        subtitle="Registro de actividad del sistema"
      />
      <div className="card p-5">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : data?.auditLogs.length ? (
          <ol className="relative space-y-4 before:absolute before:left-4 before:top-2 before:h-full before:w-px before:bg-brand-200 dark:before:bg-brand-800">
            {data.auditLogs.map((log) => {
              const meta = ACTION_META[log.action] ?? {
                icon: Activity,
                color: 'text-slate-500',
                label: log.action,
              };
              const Icon = meta.icon;
              return (
                <li key={log.id} className="relative flex gap-4 pl-1">
                  <div
                    className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white ring-2 ring-brand-200 dark:bg-slate-900 dark:ring-brand-800 ${meta.color}`}
                  >
                    <Icon size={15} />
                  </div>
                  <div className="flex-1 pb-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold">
                        {meta.label}
                        {log.entity && (
                          <span className="ml-2 rounded bg-brand-50 px-1.5 py-0.5 text-xs font-normal text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                            {log.entity}
                            {log.entityId ? ` #${log.entityId}` : ''}
                          </span>
                        )}
                      </p>
                      <span className="text-xs text-slate-400">
                        {new Date(log.createdAt).toLocaleString('es-MX')}
                      </span>
                    </div>
                    {log.details && (
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {log.details}
                      </p>
                    )}
                    <p className="text-xs text-slate-400">
                      {log.user?.fullName ?? 'Sistema'}
                      {log.ipAddress ? ` - ${log.ipAddress}` : ''}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <EmptyState message="Sin registros de auditoria" />
        )}
      </div>
    </div>
  );
}
