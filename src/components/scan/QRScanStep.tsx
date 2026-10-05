import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { motion } from 'framer-motion';
import { QrCode, X, AlertTriangle, KeyRound, RotateCcw } from 'lucide-react';
import { useCamera } from '../../hooks/useCamera';
import { Button } from '../common/Button';
import { storageService } from '../../services/storage';
import { resolveWristbandFromQr, type WristbandResolution } from '../../services/wristbandIdentity';

interface QRScanStepProps {
  onVerified: (resolution: WristbandResolution) => void;
  onCancel: () => void;
  onUseManualFallback: () => void;
}

const SCAN_INTERVAL_MS = 220;

export function QRScanStep({ onVerified, onCancel, onUseManualFallback }: QRScanStepProps) {
  const { status, errorMessage, videoRef, start, stop } = useCamera();
  const [scanState, setScanState] = useState<'scanning' | 'resolving' | 'failed'>('scanning');
  const [failMessage, setFailMessage] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cancelledRef = useRef(false);
  const resolvingRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    void start();
    return () => {
      cancelledRef.current = true;
      resolvingRef.current = false;
      stop();
    };
  }, [start, stop]);

  useEffect(() => {
    if (status !== 'streaming' || scanState !== 'scanning') return;
    let raf = 0;
    let lastTick = 0;

    const tick = (time: number) => {
      if (cancelledRef.current || resolvingRef.current) return;
      if (time - lastTick >= SCAN_INTERVAL_MS) {
        lastTick = time;
        const video = videoRef.current;
        if (video && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0) {
          const canvas = canvasRef.current ?? document.createElement('canvas');
          canvasRef.current = canvas;
          const scale = Math.min(1, 640 / video.videoWidth);
          canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
          canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const result = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' });
            if (result?.data) {
              resolvingRef.current = true;
              void handleDecoded(result.data);
              return;
            }
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // handleDecoded is intentionally stable for this scanner lifecycle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, scanState]);

  const handleDecoded = async (raw: string) => {
    setScanState('resolving');
    try {
      const resolution = await resolveWristbandFromQr(raw, storageService);
      if (cancelledRef.current) return;
      if (resolution.ok) {
        stop();
        onVerified(resolution);
      } else {
        setFailMessage(resolution.message);
        setAttempts((n) => n + 1);
        setScanState('failed');
      }
    } catch {
      if (cancelledRef.current) return;
      setFailMessage('Could not verify this wristband. Please retry or use the manual Band ID fallback.');
      setAttempts((n) => n + 1);
      setScanState('failed');
    } finally {
      resolvingRef.current = false;
    }
  };

  const retry = () => {
    resolvingRef.current = false;
    setFailMessage(null);
    setScanState('scanning');
    if (status !== 'streaming') void start();
  };

  const cameraFailed = status === 'unavailable' || status === 'denied' || status === 'error';
  const cameraStarting = status === 'idle' || status === 'requesting' || status === 'stopped';

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
      className="fixed inset-0 z-50 flex flex-col bg-ink-950"
    >
      <div className="flex items-center justify-between px-4 py-3 safe-top">
        <button onClick={onCancel} className="rounded-full bg-white/10 p-2 text-white" aria-label="Cancel QR scanner">
          <X size={20} />
        </button>
        <p className="text-sm font-semibold text-white/90">Scan Wristband QR</p>
        <div className="w-9" />
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-contain bg-black"
          playsInline muted autoPlay aria-label="Live QR camera"
        />

        {cameraStarting && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-ink-950 px-8 text-center text-white">
            <QrCode size={32} className="text-accent-400" />
            <p className="font-semibold">Starting camera…</p>
            <p className="text-sm text-ink-300">Allow camera access to verify the wristband QR.</p>
          </div>
        )}

        {cameraFailed && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-ink-950 px-8 text-center text-white">
            <AlertTriangle size={32} className="text-accent-400" />
            <p className="font-semibold">{status === 'denied' ? 'Camera permission denied.' : 'Camera unavailable.'}</p>
            <p className="max-w-md text-sm text-ink-300">{errorMessage ?? 'Use the manual fallback instead.'}</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="primary" icon={<RotateCcw size={16} />} onClick={() => void start()}>Retry camera</Button>
              <Button variant="secondary" icon={<KeyRound size={16} />} onClick={onUseManualFallback}>Enter wristband ID manually</Button>
            </div>
          </div>
        )}

        {status === 'streaming' && scanState === 'scanning' && (
          <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 px-8">
            <div className="relative flex h-52 w-52 items-center justify-center rounded-2xl border-2 border-dashed border-accent-400/80 bg-black/10">
              <QrCode size={42} className="text-accent-300/80" />
            </div>
            <div className="max-w-sm rounded-xl bg-black/50 px-4 py-3 text-center text-xs text-white/80">
              <p className="font-semibold text-emerald-300">Camera ready · Searching for QR…</p>
              <p className="mt-1">Position the wristband QR inside the frame.</p>
              <p>Move closer if the QR is too small · avoid glare · keep it steady.</p>
            </div>
          </div>
        )}

        {status === 'streaming' && scanState === 'resolving' && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50">
            <p className="text-sm font-semibold text-white">QR detected · Verifying band…</p>
          </div>
        )}

        {scanState === 'failed' && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-black/75 px-8 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/20 text-red-300">
              <AlertTriangle size={26} />
            </span>
            <p className="text-sm font-semibold text-white">{failMessage ?? 'QR could not be verified.'}</p>
            <p className="text-xs text-white/60">Attempt {attempts}. A failed scan does not consume the wristband.</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="primary" size="md" icon={<RotateCcw size={15} />} onClick={retry}>Retry scan</Button>
              <Button variant="secondary" size="md" icon={<KeyRound size={15} />} onClick={onUseManualFallback}>Enter ID manually</Button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
