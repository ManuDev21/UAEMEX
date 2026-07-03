import { useState, useRef } from 'react';
import {
  FileText,
  Upload,
  Download,
  Database,
  Eye,
  Loader2,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Table,
  Trash2,
} from 'lucide-react';
import { PageHeader, Spinner } from '../components/ui';
import { alerts } from '../lib/alerts';
import {
  uploadPdfExtract,
  uploadPdfToExcel,
  uploadPdfImport,
} from '../lib/rest';

type Action = 'extract' | 'to-excel' | 'import';

interface ExtractResult {
  rows: Record<string, string>[];
  headers: string[];
  totalRows: number;
  rawText: string;
}

interface ImportResult {
  filename: string;
  totalRows: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export default function PdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<Action | null>(null);
  const [extractResult, setExtractResult] = useState<ExtractResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const clearFile = () => {
    setFile(null);
    setExtractResult(null);
    setImportResult(null);
    setShowRaw(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (!selected.name.toLowerCase().endsWith('.pdf')) {
        alerts.error('Archivo invalido', 'Debe ser un archivo PDF');
        return;
      }
      setFile(selected);
      setExtractResult(null);
      setImportResult(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.name.toLowerCase().endsWith('.pdf')) {
      setFile(dropped);
      setExtractResult(null);
      setImportResult(null);
    } else {
      alerts.error('Archivo invalido', 'Debe ser un archivo PDF');
    }
  };

  const handleExtract = async () => {
    if (!file) return;
    setLoading('extract');
    try {
      const result = await uploadPdfExtract(file);
      setExtractResult(result);
      if (result.totalRows > 0) {
        alerts.success(
          'Datos extraidos',
          `Se encontraron ${result.totalRows} filas`,
        );
      } else {
        alerts.warning(
          'Sin datos estructurados',
          'El PDF no contiene tablas detectables. Puedes ver el texto crudo',
        );
      }
    } catch (err: any) {
      alerts.error(
        'Error al extraer',
        err?.response?.data?.message ?? 'No se pudo procesar el PDF',
      );
    } finally {
      setLoading(null);
    }
  };

  const handleToExcel = async () => {
    if (!file) return;
    setLoading('to-excel');
    try {
      await uploadPdfToExcel(file);
      alerts.success('Excel generado', 'Se descargo el archivo Excel');
    } catch (err: any) {
      alerts.error(
        'Error al convertir',
        err?.response?.data?.message ?? 'No se pudo convertir a Excel',
      );
    } finally {
      setLoading(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;
    const confirmed = await alerts.confirm(
      'Importar a base de datos',
      'Se insertaran o actualizaran los bienes extraidos del PDF. Deseas continuar?',
    );
    if (!confirmed) return;
    setLoading('import');
    try {
      const result = await uploadPdfImport(file);
      setImportResult(result);
      alerts.success(
        'Importacion completada',
        `Insertados: ${result.inserted} | Actualizados: ${result.updated} | Omitidos: ${result.skipped}`,
      );
    } catch (err: any) {
      alerts.error(
        'Error al importar',
        err?.response?.data?.message ?? 'No se pudo importar',
      );
    } finally {
      setLoading(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="PDF a Excel"
        subtitle="Sube un documento PDF, extrae sus datos y conviertelos a Excel o importalos directamente"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <FileText size={18} /> Archivo PDF
          </div>

          <div
            className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-brand-300 p-8 text-center transition hover:border-brand-500 dark:border-brand-700"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            {file ? (
              <>
                <FileText size={48} className="text-brand-600" />
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-slate-400">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
                <div className="flex items-center gap-3">
                  <button
                    className="text-xs text-brand-600 hover:underline"
                    onClick={() => inputRef.current?.click()}
                  >
                    Cambiar archivo
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 dark:text-red-400"
                    onClick={clearFile}
                  >
                    <Trash2 size={14} /> Quitar PDF
                  </button>
                </div>
              </>
            ) : (
              <>
                <Upload size={48} className="text-slate-400" />
                <p className="text-sm text-slate-500">
                  Arrastra un PDF aqui o haz clic para seleccionar
                </p>
                <button
                  className="btn-primary"
                  onClick={() => inputRef.current?.click()}
                >
                  <Upload size={16} /> Seleccionar PDF
                </button>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {file && (
            <div className="mt-4 space-y-2">
              <button
                className="btn-secondary w-full"
                onClick={handleExtract}
                disabled={loading !== null}
              >
                {loading === 'extract' ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Eye size={16} />
                )}{' '}
                Extraer y previsualizar datos
              </button>
              <button
                className="btn-secondary w-full"
                onClick={handleToExcel}
                disabled={loading !== null}
              >
                {loading === 'to-excel' ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Download size={16} />
                )}{' '}
                Descargar como Excel
              </button>
              <button
                className="btn-primary w-full"
                onClick={handleImport}
                disabled={loading !== null}
              >
                {loading === 'import' ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Database size={16} />
                )}{' '}
                Importar a base de datos
              </button>
            </div>
          )}

          {importResult && (
            <div className="mt-4 space-y-2 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <CheckCircle2 size={16} className="text-green-600" />
                Resultado de importacion
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div className="rounded bg-green-100 p-2 dark:bg-green-900/30">
                  <p className="font-bold text-green-700 dark:text-green-400">
                    {importResult.inserted}
                  </p>
                  <p className="text-xs text-slate-500">Nuevos</p>
                </div>
                <div className="rounded bg-gold-100 p-2 dark:bg-gold-900/30">
                  <p className="font-bold text-gold-700 dark:text-gold-400">
                    {importResult.updated}
                  </p>
                  <p className="text-xs text-slate-500">Actualizados</p>
                </div>
                <div className="rounded bg-orange-100 p-2 dark:bg-orange-900/30">
                  <p className="font-bold text-orange-700 dark:text-orange-400">
                    {importResult.skipped}
                  </p>
                  <p className="text-xs text-slate-500">Omitidos</p>
                </div>
              </div>
              {importResult.errors.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-slate-500">
                    Ver errores ({importResult.errors.length})
                  </summary>
                  <div className="mt-2 max-h-32 overflow-y-auto rounded bg-slate-100 p-2 text-xs dark:bg-slate-800">
                    {importResult.errors.map((err, i) => (
                      <p key={i} className="text-red-600 dark:text-red-400">
                        {err}
                      </p>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}
        </div>

        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
              <Table size={18} /> Datos extraidos
            </div>
            {extractResult && extractResult.rawText && (
              <button
                className="text-xs text-brand-600 hover:underline"
                onClick={() => setShowRaw((v) => !v)}
              >
                {showRaw ? 'Ver tabla' : 'Ver texto crudo'}
              </button>
            )}
          </div>

          {loading === 'extract' ? (
            <div className="flex justify-center py-16 text-brand-600">
              <Spinner className="h-8 w-8" />
            </div>
          ) : extractResult ? (
            showRaw ? (
              <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-100 p-3 text-xs dark:bg-slate-800">
                {extractResult.rawText}
              </pre>
            ) : extractResult.rows.length > 0 ? (
              <div className="max-h-96 overflow-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 z-10 border-b border-brand-200 bg-brand-50 dark:border-brand-800 dark:bg-brand-950/50">
                    <tr>
                      {extractResult.headers.map((h) => (
                        <th
                          key={h}
                          className="whitespace-nowrap px-3 py-2 text-left font-semibold text-brand-800 dark:text-brand-300"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {extractResult.rows.map((row, i) => (
                      <tr
                        key={i}
                        className="hover:bg-brand-50/60 dark:hover:bg-brand-950/30"
                      >
                        {extractResult.headers.map((h) => (
                          <td key={h} className="max-w-xs px-3 py-2 break-words">
                            {row[h] ?? '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-slate-400">
                <AlertCircle size={32} />
                <p className="text-sm">
                  No se detectaron datos tabulares en el PDF
                </p>
                <p className="text-xs">
                  Intenta ver el texto crudo o usa un PDF con formato de tabla
                </p>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-slate-400">
              <FileSpreadsheet size={32} />
              <p className="text-sm">
                Sube un PDF y extrae sus datos para verlos aqui
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
