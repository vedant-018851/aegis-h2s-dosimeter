import { useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { UserRoundX, QrCode, ShieldCheck, RotateCcw } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { CaptureMenu } from '../components/scan/CaptureMenu';
import { CameraCapture } from '../components/scan/CameraCapture';
import { QRScanStep } from '../components/scan/QRScanStep';
import { ManualWristbandEntry } from '../components/scan/ManualWristbandEntry';
import { DemoPresetGrid } from '../components/scan/DemoPresetGrid';
import { AlignReviewStep } from '../components/scan/AlignReviewStep';
import { ProcessingStages } from '../components/processing/ProcessingStages';
import { ResultView } from '../components/result/ResultView';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { DisclaimerTag } from '../components/common/StatusPill';
import type { GuideBox } from '../services/imageProcessing/regionSampling';
import { runScanPipeline, type WristbandGate } from '../services/scanPipeline';
import { detectArucoAlignment } from '../services/imageProcessing/arucoAlignment';
import { generateDemoFrame, DEMO_GUIDE_BOX_FRACTION } from '../services/imageProcessing/demoFrameGenerator';
import { getDemoPreset } from '../data/demoPresets';
import type { AlignmentMethod, CaptureMethod, DemoPresetId, Measurement } from '../types';
import { canUseOpticalWristbandScan, canUseQrScan } from '../data/roleAccess';
import { storageService } from '../services/storage';
import { resolveFailStage } from '../utils/stageMapping';
import { verifyWristbandStillMeasurable, type WristbandResolution } from '../services/wristbandIdentity';

type ScanStep = 'menu' | 'qr' | 'camera' | 'demo-picker' | 'review' | 'processing' | 'result';

export function ScanPage() {
  const { activeWorker, activeShift, refreshMeasurements, startShift } = useAppContext();
  const { session } = useAuth();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [step, setStep] = useState<ScanStep>('menu');
  const [frame, setFrame] = useState<HTMLCanvasElement | null>(null);
  const [demoPresetId, setDemoPresetId] = useState<DemoPresetId | null>(null);
  const [measurement, setMeasurement] = useState<Measurement | null>(null);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [shiftStartError, setShiftStartError] = useState<string | null>(null);

  // Optical scan workflow for Supervisors and Workers. Wristband identity is
  // taken from the worker/shift assignment; QR verification is Safety Officer-only.
  const [captureMethod, setCaptureMethod] = useState<CaptureMethod>('camera');
  const [alignmentMethod, setAlignmentMethod] = useState<AlignmentMethod>('manual');
  const [alignmentNote, setAlignmentNote] = useState<string | null>(null);
  const [pipelinePending, setPipelinePending] = useState(false);

  const canQrVerify = session?.role ? canUseQrScan(session.role) : false;
  const canOpticallyScan = session?.role ? canUseOpticalWristbandScan(session.role) : false;
  const [qrResolution, setQrResolution] = useState<WristbandResolution | null>(null);

  const reset = () => {
    setStep('menu');
    setFrame(null);
    setDemoPresetId(null);
    setMeasurement(null);
    setSaved(false);
    setSaveError(null);
    setAlignmentNote(null);
  };

  const presetParam = params.get('preset') as DemoPresetId | null;
  useEffect(() => {
    if (!canOpticallyScan) return;
    if (presetParam && activeShift && step === 'menu') {
      setFrame(generateDemoFrame(presetParam));
      setDemoPresetId(presetParam);
      setCaptureMethod('demo');
      setAlignmentMethod('demo');
      setStep('review');
      setParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetParam, activeShift, canOpticallyScan]);

  // Safety Officers have a dedicated QR verification workflow. They must not
  // enter the optical measurement pipeline, because physical strip/reference/
  // expiry scanning belongs only to Supervisors and Workers.
  if (canQrVerify) {
    return (
      <SafetyOfficerQrScan
        resolution={qrResolution}
        onVerified={setQrResolution}
        onReset={() => setQrResolution(null)}
        onBack={() => navigate('/')}
      />
    );
  }

  if (!canOpticallyScan) {
    return null;
  }

  if (activeWorker && !activeShift) {
    const wb = activeWorker.wristbandId;
    return (
      <Card className="flex flex-col items-center gap-3 py-10 text-center">
        <p className="text-sm font-semibold text-ink-800">No active shift for {activeWorker.name}</p>
        <p className="max-w-xs text-xs text-ink-500">
          {wb ? `Start a shift with wristband ${wb} before scanning.` : 'Assign a wristband (Wristbands page), then start a shift.'}
        </p>
        {shiftStartError && <p className="max-w-md rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{shiftStartError}</p>}
        {wb ? (
          <Button variant="primary" onClick={async () => {
            setShiftStartError(null);
            try {
              await startShift(activeWorker.id, wb, 'Demo');
            } catch (err) {
              setShiftStartError(err instanceof Error ? err.message : 'Could not start the shift.');
            }
          }}>Start shift</Button>
        ) : (
          <Button variant="primary" onClick={() => navigate('/wristbands')}>Open wristbands</Button>
        )}
      </Card>
    );
  }

  if (!activeWorker) {
    return (
      <Card className="flex flex-col items-center gap-3 py-10 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-100 text-ink-500">
          <UserRoundX size={22} />
        </span>
        <p className="text-sm font-semibold text-ink-800">No worker selected</p>
        <p className="max-w-xs text-xs text-ink-500">
          Select an active worker before scanning a wristband so the reading can be attributed correctly.
        </p>
        <Button variant="primary" onClick={() => navigate('/workers')}>
          Select worker
        </Button>
      </Card>
    );
  }

  const fallbackWristbandId = activeShift?.wristbandId ?? activeWorker.wristbandId ?? null;

  const handleFileUpload = (file: File) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    let settled = false;
    const cleanup = () => {
      URL.revokeObjectURL(url);
      img.onload = null;
      img.onerror = null;
    };
    img.onload = () => {
      if (settled) return;
      settled = true;
      try {
        if (!img.naturalWidth || !img.naturalHeight) {
          throw new Error('This image has no readable dimensions.');
        }
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('The selected image could not be prepared for analysis.');
        ctx.drawImage(img, 0, 0);
        setCaptureMethod('upload');
        applyAlignment(canvas);
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : 'This image could not be loaded. Please choose another image.');
        setStep('menu');
      } finally {
        cleanup();
      }
    };
    img.onerror = () => {
      if (settled) return;
      settled = true;
      cleanup();
      setSaveError('This image could not be loaded. Please choose another image.');
      setStep('menu');
    };
    img.src = url;
  };

  const handleDemoSelect = (id: DemoPresetId) => {
    const canvas = generateDemoFrame(id);
    setFrame(canvas);
    setDemoPresetId(id);
    setCaptureMethod('demo');
    setAlignmentMethod('demo');
    setAlignmentNote(null);
    setStep('review');
  };

  // ArUco automatic alignment (spec §3/§4): attempted once per real (non-demo)
  // capture. On success the rectified frame replaces the raw one and feeds
  // the EXISTING guide-box/region pipeline unchanged; on failure the raw
  // frame + existing manual guide box is used exactly as before.
  const applyAlignment = (canvas: HTMLCanvasElement) => {
    const result = detectArucoAlignment(canvas);
    if (result.ok) {
      setFrame(result.rectified);
      setAlignmentMethod('aruco');
      setAlignmentNote('Automatically aligned using ArUco corner markers.');
    } else {
      setFrame(canvas);
      setAlignmentMethod('manual');
      setAlignmentNote(null);
    }
    setDemoPresetId(null);
    setStep('review');
  };

  const runPipeline = async (guideBox: GuideBox) => {
    if (!frame || pipelinePending) return;
    setPipelinePending(true);
    setSaveError(null);
    try {
      const isDemo = demoPresetId !== null;

      // Re-verify the wristband right before analysis (spec §2) — its state
      // may have changed since the QR/manual identity step. Demo mode never
      // gates against the real wristband store.
      let wristbandGate: WristbandGate | undefined;
      let wristbandId: string | null;
      if (isDemo) {
        wristbandId = activeShift?.wristbandId ?? activeWorker.wristbandId ?? null;
      } else if (fallbackWristbandId) {
        // Supervisors and Workers use the wristband assigned to the active worker.
        // QR/manual identity verification is intentionally unavailable for this role.
        const revalidated = await verifyWristbandStillMeasurable(fallbackWristbandId, storageService);
        wristbandId = fallbackWristbandId;
        wristbandGate = revalidated.ok
          ? { ok: true }
          : { ok: false, code: revalidated.code ?? 'INVALID_WRISTBAND', message: revalidated.message };
      } else {
        wristbandId = null;
      }

      const result = runScanPipeline(
        frame,
        guideBox,
        {
          workerId: activeWorker.id,
          shiftId: activeShift?.id ?? null,
          wristbandId,
          isDemo,
          demoPresetId,
          wristbandGate,
          captureMethod: isDemo ? 'demo' : captureMethod,
          alignmentMethod: isDemo ? 'demo' : alignmentMethod,
          // Optical-role scans do not use QR verification.
          wristbandQrVerified: false,
        }
      );
      setMeasurement(result);
      setStep('processing');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Analysis could not be completed. Please retry the scan.');
      setStep('review');
    } finally {
      setPipelinePending(false);
    }
  };

  const handleSave = async () => {
    if (!measurement) return;
    setSaveError(null);
    try {
      // Real accepted readings are committed together with wristband consumption
      // so a successful save can never leave the band reusable.
      await storageService.commitMeasurement(measurement);
      await refreshMeasurements();
      setSaved(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save this measurement.');
    }
  };

  const failAt = measurement ? resolveFailStage(measurement) : null;

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-lg font-bold text-ink-900">Scan Wristband</h1>
        <p className="text-xs text-ink-500 mt-0.5">
          {activeWorker.name} · {activeShift ? `${activeShift.label} shift` : 'No active shift'} ·{' '}
          {fallbackWristbandId ?? 'No wristband assigned'}
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file);
          e.target.value = '';
        }}
      />

      <AnimatePresence mode="wait">
        {step === 'menu' && (
          <CaptureMenu
            key="menu"
            onLiveCamera={() => setStep('camera')}
            onUpload={() => fileInputRef.current?.click()}
            onDemoMode={() => setStep('demo-picker')}
          />
        )}

        {step === 'demo-picker' && (
          <DemoPresetGrid key="demo-picker" onSelect={handleDemoSelect} onBack={() => setStep('menu')} />
        )}

        {step === 'review' && frame && (
          <div key="review">
            {alignmentNote && (
              <div className="mb-3">
                <DisclaimerTag>{alignmentNote}</DisclaimerTag>
              </div>
            )}
            {saveError && (
              <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{saveError}</div>
            )}
            <AlignReviewStep
              frame={frame}
              onConfirm={runPipeline}
              onRetake={reset}
              initialBoxFraction={
                demoPresetId || alignmentMethod === 'aruco' ? DEMO_GUIDE_BOX_FRACTION : undefined
              }
              helperText={
                demoPresetId
                  ? `Preview of "${getDemoPreset(demoPresetId)?.label}" — adjust the box if needed, then run analysis.`
                  : alignmentMethod === 'aruco'
                    ? 'Alignment box pre-positioned from ArUco markers — adjust if needed, then run analysis.'
                    : undefined
              }
            />
            {pipelinePending && <p className="mt-2 text-center text-xs text-ink-400">Verifying wristband…</p>}
          </div>
        )}

        {step === 'processing' && (
          <ProcessingStages key="processing" failAt={failAt} onComplete={() => setStep('result')} />
        )}

        {step === 'result' && measurement && (
          <div key="result">
            {saveError && (
              <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                {saveError}
              </div>
            )}
            <ResultView measurement={measurement} onRetake={reset} onSave={handleSave} saved={saved} />
          </div>
        )}
      </AnimatePresence>

      {step === 'camera' && (
        <CameraCapture
          onCancel={() => setStep('menu')}
          onUploadInstead={() => {
            setStep('menu');
            fileInputRef.current?.click();
          }}
          onCapture={(canvas) => {
            setCaptureMethod('camera');
            applyAlignment(canvas);
          }}
        />
      )}
    </div>
  );
}


function SafetyOfficerQrScan({
  resolution,
  onVerified,
  onReset,
  onBack,
}: {
  resolution: WristbandResolution | null;
  onVerified: (resolution: WristbandResolution) => void;
  onReset: () => void;
  onBack: () => void;
}) {
  const [manualOpen, setManualOpen] = useState(false);

  if (resolution?.ok && resolution.wristband) {
    const band = resolution.wristband;
    return (
      <div className="space-y-4">
        <Card>
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <ShieldCheck size={22} />
            </span>
            <div>
              <h1 className="text-lg font-bold text-ink-900">Wristband QR Verified</h1>
              <p className="mt-1 text-xs text-ink-500">
                Safety Officer verification only. Optical scanning of the reactive strip, reference patch and expiry indicator is restricted to Supervisors and Workers.
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-2 rounded-xl border border-ink-200 bg-ink-50 p-4 text-sm">
            <Row label="Band ID" value={band.id} />
            <Row label="Batch" value={band.batch} />
            <Row label="Status" value={band.status.toUpperCase()} />
            <Row label="Expiry" value={new Date(band.expiresAt).toLocaleDateString()} />
          </div>
        </Card>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" icon={<RotateCcw size={16} />} onClick={onReset}>Scan another QR</Button>
          <Button variant="secondary" onClick={onBack}>Back to dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-100 text-accent-700">
            <QrCode size={22} />
          </span>
          <div>
            <h1 className="text-lg font-bold text-ink-900">Wristband QR Verification</h1>
            <p className="mt-1 text-xs text-ink-500">
              Safety Officer access only. Scan the printed Band ID for identification and traceability. This does not perform the optical H₂S measurement.
            </p>
          </div>
        </div>
      </Card>

      <QRScanStep
        onCancel={onBack}
        onVerified={onVerified}
        onUseManualFallback={() => setManualOpen(true)}
      />

      <ManualWristbandEntry
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        onResolved={(resolved) => {
          setManualOpen(false);
          onVerified(resolved);
        }}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-ink-500">{label}</span>
      <span className="font-semibold text-ink-900">{value}</span>
    </div>
  );
}
