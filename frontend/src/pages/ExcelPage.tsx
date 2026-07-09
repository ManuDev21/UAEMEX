import { useRef, useState } from 'react';
import { useQuery } from '@apollo/client';
import {
  Upload,
  Download,
  FileSpreadsheet,
  FileDown,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { RECENT_IMPORTS } from '../graphql/operations';
import { PageHeader, Skeleton, EmptyState, Spinner } from '../components/ui';
import { downloadFile, uploadExcel } from '../lib/rest';
import { alerts } from '../lib/alerts';

interface ImportResult {
  filename: string;
  totalRows: number;
  inserted: number;
  updated: number;
  skipped: number;
  errorCount: number;
}

interface ImportRecord extends ImportResult {
  id: string;
  createdAt: string;
  user?: { fullName: string };
}

export default function ExcelPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const { data, loading, refetch } = useQuery<{
    recentImports: ImportRecord[];
  }>(RECENT_IMPORTS, { variables: { limit: 10 } });

  const handleFile = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      alerts.error('Formato invalido', 'Selecciona un archivo .xlsx o .xls');
      return;
    }
    setUploading(true);
    setResult(null);
    try {
      const res = await uploadExcel(file);
      setResult(res);
      alerts.success(
        'Importacion completada',
        `${res.inserted} nuevos, ${res.updated} actualizados`,
      );
      refetch();
    } catch (err: any) {
      alerts.error(
        'Error al importar',
        err?.response?.data?.message ?? err?.message,
      );
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadFile('/excel/export', 'inventario_actualizado.xlsx');
      alerts.success('Exportacion lista');
    } catch (err: any) {
      alerts.error('Error al exportar', err?.message);
    } finally {
      setExporting(false);
    }
  };

  const handleTemplate = async () => {
    try {
      await downloadFile('/excel/template', 'plantilla_inventario.xlsx');
    } catch (err: any) {
      alerts.error('Error al descargar plantilla', err?.message);
    }
  };

  return (
    <div>
      <PageHeader
        title="Importar / Exportar"
        subtitle="Carga masiva y descarga de inventario en Excel"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <Upload size={18} /> Importar inventario
          </div>

          <div
            className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-brand-300 p-8 text-center transition hover:border-brand-500 hover:bg-brand-50/50 dark:border-brand-700 dark:hover:bg-brand-950/30"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file) handleFile(file);
            }}
          >
            {uploading ? (
              <Spinner className="h-8 w-8 text-brand-600" />
            ) : (
              <FileSpreadsheet size={40} className="text-brand-600" />
            )}
            <p className="mt-3 text-sm font-medium">
              Arrastra un archivo .xlsx o .xls o haz clic para seleccionar
            </p>
            <p className="text-xs text-slate-400">
              El sistema actualiza los bienes existentes por codigo
            </p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />

          <button
            onClick={handleTemplate}
            className="btn-secondary mt-4 w-full"
          >
            <FileDown size={16} /> Descargar plantilla
          </button>

          {result && (
            <div className="mt-4 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
              <div className="mb-2 flex items-center gap-2 font-semibold text-brand-700">
                <CheckCircle2 size={18} /> {result.filename}
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                <Stat label="Filas" value={result.totalRows} />
                <Stat
                  label="Nuevos"
                  value={result.inserted}
                  color="text-emerald-600"
                />
                <Stat
                  label="Actualizados"
                  value={result.updated}
                  color="text-gold-600"
                />
                <Stat
                  label="Omitidos"
                  value={result.skipped}
                  color="text-amber-600"
                />
              </div>
              {result.errorCount > 0 && (
                <p className="mt-2 flex items-center gap-1 text-xs text-amber-600">
                  <AlertTriangle size={14} /> {result.errorCount} filas con
                  advertencias
                </p>
              )}
            </div>
          )}
        </div>

        <div className="card p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <Download size={18} /> Exportar inventario
          </div>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            Descarga el inventario completo y actualizado en formato Excel, con
            todos los campos, categorias, departamentos y responsables.
          </p>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="btn-primary w-full"
          >
            {exporting ? <Spinner /> : <Download size={16} />} Exportar a Excel
          </button>

          <div className="mt-6">
            <h4 className="mb-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
              Importaciones recientes
            </h4>
            {loading ? (
              <Skeleton className="h-32" />
            ) : data?.recentImports.length ? (
              <ul className="space-y-2">
                {data.recentImports.map((imp) => (
                  <li
                    key={imp.id}
                    className="flex items-center justify-between rounded-lg bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800"
                  >
                    <div>
                      <p className="font-medium">{imp.filename}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(imp.createdAt).toLocaleString('es-MX')} -{' '}
                        {imp.user?.fullName ?? 'Sistema'}
                      </p>
                    </div>
                    <span className="text-xs text-slate-500">
                      +{imp.inserted} / ~{imp.updated}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState message="Sin importaciones registradas" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  color = '',
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}
