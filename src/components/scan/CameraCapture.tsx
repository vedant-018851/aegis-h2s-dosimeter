import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, X, ImagePlus, AlertTriangle, RotateCcw } from 'lucide-react';
import { useCamera } from '../../hooks/useCamera';
import { Button } from '../common/Button';

interface CameraCaptureProps {
  onCapture: (canvas: HTMLCanvasElement) => void;
  onCancel: () => void;
  onUploadInstead: () => void;
}

export function CameraCapture({ onCapture, onCancel, onUploadInstead }: CameraCaptureProps) {
  const { status, errorMessage, videoRef, start, stop, captureFrame } = useCamera();
  const [captureError, setCaptureError] = useState<string | null>(null);

  useEffect(() => {
    void start();
    return () => stop();
  }, [start, stop]);

  const handleCapture = () => {
    setCaptureError(null);
    const canvas = captureFrame();
    if (!canvas) {
      setCaptureError('The camera frame is not ready yet. Hold still and try again.');
      return;
    }
    onCapture(canvas);
  };

  const cameraFailed = status === 'unavailable' || status === 'denied' || status === 'error';
  const cameraStarting = status === 'idle' || status === 'requesting' || status === 'stopped';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-50 flex flex-col bg-ink-950"
    >
      <div className="flex items-center justify-between px-4 py-3 safe-top">
        <button onClick={onCancel} className="rounded-full bg-white/10 p-2 text-white" aria-label="Cancel camera">
          <X size={20} />
        </button>
        <p className="text-sm font-semibold text-white/90">Scan Wristband</p>
        <div className="w-9" />
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-contain bg-black"
          playsInline
          muted
          autoPlay
          aria-label="Live wristband camera"
        />

        {cameraStarting && (
          <div className="absolute inset-0 z-10 flex h-full flex-col items-center justify-center gap-3 px-8 text-center text-white">
            <Camera size={32} className="text-accent-400" />
            <p className="font-semibold">Starting camera…</p>
            <p className="text-sm text-ink-300">Allow camera access and keep the wristband in view.</p>
          </div>
        )}

        {cameraFailed && (
          <div className="absolute inset-0 z-20 flex h-full flex-col items-center justify-center gap-3 bg-ink-950 px-8 text-center text-white">
            <AlertTriangle size={32} className="text-accent-400" />
            <p className="font-semibold">
              {status === 'denied' ? 'Camera permission denied.' : status === 'unavailable' ? 'Camera unavailable.' : 'Camera failed to start.'}
            </p>
            <p className="max-w-md text-sm text-ink-300">{errorMessage ?? 'Try again or use an image instead.'}</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="primary" icon={<RotateCcw size={16} />} onClick={() => void start()}>
                Retry camera
              </Button>
              <Button variant="secondary" icon={<ImagePlus size={16} />} onClick={onUploadInstead}>
                Upload image instead
              </Button>
            </div>
          </div>
        )}

        {status === 'streaming' && <AlignmentGuideOverlay />}
      </div>

      {status === 'streaming' && (
        <div className="flex flex-col items-center gap-3 pb-8 pt-4 safe-bottom">
          <p className="px-8 text-center text-xs text-white/70">
            Align the complete sensing area inside the frame. Keep the band steady and avoid glare.
          </p>
          {captureError && <p className="text-xs font-medium text-red-300">{captureError}</p>}
          <p className="rounded-full bg-black/50 px-3 py-1 text-[11px] font-semibold text-emerald-300">Camera ready · Capture enabled</p>
          <div className="flex items-center gap-6">
            <button
              onClick={onUploadInstead}
              className="rounded-full bg-white/10 p-3 text-white active:scale-95 transition-transform"
              aria-label="Upload image instead"
            >
              <ImagePlus size={18} />
            </button>
            <button
              onClick={handleCapture}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-white ring-4 ring-white/30 active:scale-95 transition-transform"
              aria-label="Capture"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-500 text-white">
                <Camera size={22} />
              </span>
            </button>
            <div className="w-11" />
          </div>
        </div>
      )}
    </motion.div>
  );
}

function AlignmentGuideOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-6">
      <div className="relative w-full max-w-md aspect-[2.4/1] rounded-2xl border-2 border-dashed border-accent-400/80">
        <div className="absolute inset-2 grid grid-cols-[42%_28%_14%] gap-1.5">
          <GuideCell label="SENSING" />
          <GuideCell label="REFERENCE" />
          <GuideCell label="EXPIRY" small />
        </div>
        {['-top-1 -left-1 border-t-2 border-l-2', '-top-1 -right-1 border-t-2 border-r-2', '-bottom-1 -left-1 border-b-2 border-l-2', '-bottom-1 -right-1 border-b-2 border-r-2'].map(
          (pos, i) => <span key={i} className={`absolute h-4 w-4 border-accent-300 ${pos}`} />
        )}
      </div>
    </div>
  );
}

function GuideCell({ label, small }: { label: string; small?: boolean }) {
  return (
    <div className="flex items-end justify-center rounded-md border border-white/25 bg-white/5 pb-1">
      <span className={`font-bold uppercase tracking-wider text-white/80 ${small ? 'text-[7px]' : 'text-[8px]'}`}>
        {label}
      </span>
    </div>
  );
}
