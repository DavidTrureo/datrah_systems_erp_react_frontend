import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, X, RefreshCw, AlertCircle, Check } from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (decodedText: string) => void;
  title?: string;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  title = 'Escanear Código de Barras / QR',
}) => {
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [, setIsScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'reader-barcode-scanner';

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      return;
    }

    // List cameras
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length) {
          setCameras(devices);
          // Prefer back camera if available
          const backCam = devices.find(
            (d) => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('trasera')
          );
          setSelectedCamera(backCam ? backCam.id : devices[0].id);
        } else {
          setErrorMessage('No se encontraron cámaras disponibles en este dispositivo.');
        }
      })
      .catch((err) => {
        console.error('Error al detectar cámaras:', err);
        setErrorMessage('Permiso de cámara denegado o no disponible en este navegador.');
      });

    return () => {
      stopScanner();
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && selectedCamera) {
      startScanner(selectedCamera);
    }
  }, [isOpen, selectedCamera]);

  const startScanner = async (cameraId: string) => {
    try {
      await stopScanner();
      setErrorMessage(null);

      const html5QrCode = new Html5Qrcode(scannerContainerId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.QR_CODE,
        ],
        verbose: false,
      });

      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        cameraId,
        {
          fps: 15,
          qrbox: { width: 280, height: 180 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          // Success Callback
          stopScanner().then(() => {
            onScan(decodedText.trim());
            onClose();
          });
        },
        () => {
          // Ignore frequent frame decode failure
        }
      );

      setIsScanning(true);
    } catch (err: any) {
      console.error('Error al iniciar escáner:', err);
      setErrorMessage(err?.message || 'No se pudo iniciar el flujo de video de la cámara.');
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (e) {
        console.warn('Error al detener escáner:', e);
      }
    }
    html5QrCodeRef.current = null;
    setIsScanning(false);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onScan(manualCode.trim());
      setManualCode('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-2 text-white font-semibold">
            <Camera className="w-5 h-5 text-blue-400" />
            <span>{title}</span>
          </div>
          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Selector (if multiple) */}
        {cameras.length > 1 && (
          <div className="px-4 py-2 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between text-xs text-slate-300">
            <span>Cámara:</span>
            <select
              value={selectedCamera}
              onChange={(e) => setSelectedCamera(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white rounded px-2 py-1 text-xs outline-none"
            >
              {cameras.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label || `Cámara ${c.id}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Video Area */}
        <div className="relative bg-black min-h-[300px] flex items-center justify-center overflow-hidden">
          <div id={scannerContainerId} className="w-full h-full min-h-[300px]" />

          {errorMessage && (
            <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center">
              <AlertCircle className="w-10 h-10 text-rose-400 mb-2" />
              <p className="text-sm text-slate-200 mb-4">{errorMessage}</p>
              <button
                type="button"
                onClick={() => selectedCamera && startScanner(selectedCamera)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium flex items-center gap-2 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reintentar Cámara
              </button>
            </div>
          )}
        </div>

        {/* Manual Input Fallback */}
        <div className="p-4 bg-slate-900 border-t border-slate-800">
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              placeholder="O escribe el código manualmente..."
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" /> Ingresar
            </button>
          </form>
          <p className="text-[11px] text-slate-400 text-center mt-2">
            Apunta la cámara al código de barras o código QR del producto.
          </p>
        </div>
      </div>
    </div>
  );
};
