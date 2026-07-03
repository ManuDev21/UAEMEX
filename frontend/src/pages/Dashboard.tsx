import { useQuery } from '@apollo/client';
import { motion } from 'framer-motion';
import {
  Package,
  CheckCircle2,
  Wrench,
  Ban,
  DollarSign,
  Building2,
  Tags,
  Clock,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { DASHBOARD_STATS } from '../graphql/operations';
import { PageHeader, Skeleton, EmptyState } from '../components/ui';
import type { DashboardStats, AssetMovement } from '../types';

const COLORS = ['#009975', '#EAC102', '#006e54', '#d4a800', '#2aa374', '#efc954'];

const currency = (n: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(n);

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
  delay,
}: {
  icon: typeof Package;
  label: string;
  value: string | number;
  accent: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="card p-5"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
        </div>
        <div className={`rounded-xl p-3 ${accent}`}>
          <Icon size={22} />
        </div>
      </div>
    </motion.div>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-5">
      <h3 className="mb-4 text-sm font-semibold text-slate-600 dark:text-slate-300">
        {title}
      </h3>
      {children}
    </div>
  );
}

export default function Dashboard() {
  const { data, loading } = useQuery<{
    dashboardStats: DashboardStats;
    recentMovements: AssetMovement[];
  }>(DASHBOARD_STATS);

  if (loading && !data) {
    return (
      <div>
        <PageHeader title="Dashboard" subtitle="Resumen general del inventario" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  const stats = data?.dashboardStats;
  if (!stats) return <EmptyState message="Sin datos disponibles" />;

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Resumen general del inventario" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Package}
          label="Total de bienes"
          value={stats.totalAssets}
          accent="bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300"
          delay={0.05}
        />
        <StatCard
          icon={CheckCircle2}
          label="Bienes activos"
          value={stats.activeAssets}
          accent="bg-gold-100 text-gold-700 dark:bg-gold-900/40 dark:text-gold-400"
          delay={0.1}
        />
        <StatCard
          icon={Wrench}
          label="En mantenimiento"
          value={stats.maintenanceAssets}
          accent="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
          delay={0.15}
        />
        <StatCard
          icon={Ban}
          label="Dados de baja"
          value={stats.retiredAssets}
          accent="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
          delay={0.2}
        />
        <StatCard
          icon={DollarSign}
          label="Valor total"
          value={currency(stats.totalValue)}
          accent="bg-gold-100 text-gold-700 dark:bg-gold-900/40 dark:text-gold-400"
          delay={0.25}
        />
        <StatCard
          icon={Building2}
          label="Departamentos"
          value={stats.totalDepartments}
          accent="bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-400"
          delay={0.3}
        />
        <StatCard
          icon={Tags}
          label="Categorias"
          value={stats.totalCategories}
          accent="bg-gold-100 text-gold-700 dark:bg-gold-900/40 dark:text-gold-400"
          delay={0.35}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ChartCard title="Bienes por departamento">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.byDepartment}>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: '#0f172a',
                  border: 'none',
                  borderRadius: 8,
                  color: '#fff',
                }}
              />
              <Bar dataKey="count" fill="#009975" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Bienes por categoria">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={stats.byCategory}
                dataKey="count"
                nameKey="label"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={(e: any) => `${e.label} (${e.count})`}
                labelLine={false}
              >
                {stats.byCategory.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: '#0f172a',
                  border: 'none',
                  borderRadius: 8,
                  color: '#fff',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Movimientos mensuales">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={stats.monthlyMovements}>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: '#0f172a',
                  border: 'none',
                  borderRadius: 8,
                  color: '#fff',
                }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#EAC102"
                strokeWidth={3}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Ultimos movimientos">
          {data?.recentMovements?.length ? (
            <ul className="space-y-3">
              {data.recentMovements.map((m) => (
                <li key={m.id} className="flex items-start gap-3 text-sm">
                  <div className="mt-0.5 rounded-lg bg-slate-100 p-1.5 text-slate-500 dark:bg-slate-800">
                    <Clock size={14} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">
                      {m.field}: {m.oldValue || '-'} &rarr; {m.newValue || '-'}
                    </p>
                    <p className="text-xs text-slate-400">
                      {m.user?.fullName ?? 'Sistema'} -{' '}
                      {new Date(m.createdAt).toLocaleString('es-MX')}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState message="Sin movimientos recientes" />
          )}
        </ChartCard>
      </div>
    </div>
  );
}
