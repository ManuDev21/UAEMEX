import { useEffect, useRef, useState, useCallback } from 'react';
import { useApolloClient } from '@apollo/client';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  ScanLine,
  Camera,
  CameraOff,
  Search,
  SwitchCamera,
  Zap,
  ZapOff,
  RefreshCw,
} from 'lucide-react';
import { ASSET_BY_CODE } from '../graphql/operations';
import { PageHeader, StatusBadge, EmptyState, Spinner } from '../components/ui';
import { alerts } from '../lib/alerts';
import type { Asset } from '../types';

const READER_ID = 'qr-reader';

export default function Scanner() {
  const client = useApolloClient();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [asset, setAsset] = useState<Asset | null>(null);
  const [notFound, setNotFound] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>(
    'environment',
  );
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [starting, setStarting] = useState(false);

  const lookup = useCallback(
    async (code: string) => {
      if (!code) return;
      setLoading(true);
      setNotFound(null);
      setAsset(null);
      try {
        const { data } = await client.query<{ assetByCode: Asset }>({
          query: ASSET_BY_CODE,
          variables: { code },
          fetchPolicy: 'network-only',
        });
        setAsset(data.assetByCode);
        alerts.success('Bien encontrado', data.assetByCode.description);
      } catch {
        setNotFound(code);
        alerts.error('No encontrado', `Codigo: ${code}`);
      } finally {
        setLoading(false);
      }
    },
    [client],
  );

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch {
        /* ignore */
      }
      scannerRef.current = null;
    }
    setScanning(false);
    setTorchOn(false);
    setTorchSupported(false);
  }, []);

  const startScanner = useCallback(async () => {
    if (scanning || starting) return;
    setStarting(true);
    setScanning(true);

    await new Promise((r) => setTimeout(r, 150));

    try {
      const html5 = new Html5Qrcode(READER_ID, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.UPC_A,
        ],
        verbose: false,
      });
      scannerRef.current = html5;

      await html5.start(
        { facingMode },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        async (decodedText) => {
          await stopScanner();
          await lookup(decodedText.trim());
        },
        () => {},
      );

      // Check torch support
      try {
        const caps = await html5.getRunningTrackCameraCapabilities();
        if (caps.torchFeature && caps.torchFeature().isSupported()) {
          setTorchSupported(true);
        }
      } catch {
        /* torch not supported */
      }
    } catch (err: any) {
      setScanning(false);
      alerts.error(
        'No se pudo acceder a la camara',
        err?.message ??
          'Verifica que hayas concedido permisos de camara en tu navegador',
      );
    } finally {
      setStarting(false);
    }
  }, [scanning, starting, facingMode, stopScanner, lookup]);

  const switchCamera = useCallback(async () => {
    await stopScanner();
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
    setTimeout(() => {
      void startScanner();
    }, 200);
  }, [stopScanner, startScanner]);

  const toggleTorch = useCallback(async () => {
    if (!scannerRef.current) return;
    try {
      if (torchOn) {
        await scannerRef.current.applyVideoConstraints({
          advanced: [{ torch: false } as any],
        });
        setTorchOn(false);
      } else {
        await scannerRef.current.applyVideoConstraints({
          advanced: [{ torch: true } as any],
        });
        setTorchOn(true);
      }
    } catch {
      alerts.error('Linterna no disponible', 'Tu dispositivo no soporta esta funcion');
    }
  }, [torchOn]);

  useEffect(() => {
    return () => {
      void stopScanner();
    };
  }, [stopScanner]);

  return (
    <div>
      <PageHeader
        title="Escaner de codigos"
        subtitle="Escanea el codigo de barras o QR del bien para consultarlo"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <ScanLine size={18} /> Camara
          </div>

          <div
            id={READER_ID}
            className="relative mx-auto aspect-video w-full overflow-hidden rounded-xl bg-slate-900"
          >
            {!scanning && (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400">
                <Camera size={48} />
                <p className="text-sm">La camara esta apagada</p>
                <p className="text-xs text-slate-500">
 Presiona el boton para activarla
                </p>
              </div>
            )}
            {scanning && (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                <div className="h-[150px] w-[250px] rounded-lg border-2 border-gold-500/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]" />
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {scanning ? (
              <>
                <button className="btn-danger" onClick={stopScanner}>
                  <CameraOff size={16} /> Detener
                </button>
                <button
                  className="btn-secondary"
                  onClick={switchCamera}
                  title="Cambiar camara"
                >
                  <SwitchCamera size={16} /> Cambiar
                </button>
                {torchSupported && (
                  <button
                    className={torchOn ? 'btn-primary' : 'btn-secondary'}
                    onClick={toggleTorch}
                    title="Linterna"
                  >
                    {torchOn ? <Zap size={16} /> : <ZapOff size={16} />} Flash
                  </button>
                )}
              </>
            ) : (
              <button
                className="btn-primary"
                onClick={startScanner}
                disabled={starting}
              >
                {starting ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" /> Iniciando...
                  </>
                ) : (
                  <>
                    <Camera size={16} /> Iniciar escaner
                  </>
                )}
              </button>
            )}
          </div>

          <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-800">
            <label className="label">Busqueda manual por codigo</label>
            <div className="flex gap-2">
              <input
                className="input"
                placeholder="Ingresa el codigo..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) =>
                  e.key === 'Enter' && lookup(manualCode.trim())
                }
              />
              <button
                className="btn-primary shrink-0"
                onClick={() => lookup(manualCode.trim())}
              >
                <Search size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="mb-4 text-sm font-semibold text-slate-600 dark:text-slate-300">
            Resultado
          </div>
          {loading ? (
            <div className="flex justify-center py-16 text-brand-600">
              <Spinner className="h-8 w-8" />
            </div>
          ) : asset ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm text-slate-400">
                  {asset.code}
                </span>
                <StatusBadge status={asset.status} />
              </div>
              <h3 className="text-xl font-bold">{asset.description}</h3>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <Detail label="Marca" value={asset.brand} />
                <Detail label="Modelo" value={asset.model} />
                <Detail label="Serie" value={asset.serialNumber} />
                <Detail
                  label="Valor"
                  value={new Intl.NumberFormat('es-MX', {
                    style: 'currency',
                    currency: 'MXN',
                  }).format(asset.value)}
                />
                <Detail label="Categoria" value={asset.category?.name} />
                <Detail label="Departamento" value={asset.department?.name} />
                <Detail
                  label="Responsable"
                  value={asset.responsable?.fullName}
                />
                <Detail
                  label="Fecha de compra"
                  value={
                    asset.purchaseDate
                      ? new Date(asset.purchaseDate).toLocaleDateString('es-MX')
                      : undefined
                  }
                />
              </dl>
              {asset.observations && (
                <div className="rounded-lg bg-slate-100 p-3 text-sm dark:bg-slate-800">
                  {asset.observations}
                </div>
              )}
            </div>
          ) : notFound ? (
            <EmptyState
              message={`No se encontro ningun bien con el codigo "${notFound}"`}
            />
          ) : (
            <EmptyState message="Escanea o ingresa un codigo para ver los detalles" />
          )}
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="font-medium">{value || '-'}</dd>
    </div>
  );
}
