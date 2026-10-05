import { useState } from 'react';
import { ChevronDown, FlaskConical } from 'lucide-react';
import type { Measurement } from '../../types';
import { Card } from '../common/Card';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-ink-100 py-1.5 last:border-0">
      <span className="text-xs text-ink-500">{label}</span>
      <span className="tabular text-xs font-semibold text-ink-800">{value}</span>
    </div>
  );
}

export function TechnicalDetails({ measurement }: { measurement: Measurement }) {
  const [open, setOpen] = useState(false);
  const cf = measurement.colorFeatures;

  return (
    <Card padded={false} className="overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3.5 sm:px-5"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-ink-900">
          <FlaskConical size={15} className="text-ink-500" />
          Technical Analysis
        </span>
        <ChevronDown size={16} className={`text-ink-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="border-t border-ink-100 px-4 py-4 sm:px-5">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-400">Traceability</p>
          <Row label="Worker" value={measurement.workerId ?? '—'} />
          <Row label="Shift" value={measurement.shiftId ?? '—'} />
          <Row label="Wristband" value={measurement.wristbandId ?? '—'} />
          <Row label="Wristband identity" value={measurement.wristbandQrVerified ? 'QR verified' : measurement.isDemo ? 'Simulated (demo)' : 'Assigned wristband'} />
          <Row label="Capture method" value={measurement.captureMethod ?? '—'} />
          <Row label="Alignment method" value={measurement.alignmentMethod ?? '—'} />
          <Row label="Image size" value={measurement.imageWidth && measurement.imageHeight ? `${measurement.imageWidth} × ${measurement.imageHeight}` : '—'} />
          {measurement.rejectionCode && <Row label="Rejection code" value={measurement.rejectionCode} />}

          {cf ? (
            <>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-400">Sensing patch (raw RGB)</p>
              <Row label="R, G, B" value={`${cf.sensingRaw.meanRgb.r.toFixed(0)}, ${cf.sensingRaw.meanRgb.g.toFixed(0)}, ${cf.sensingRaw.meanRgb.b.toFixed(0)}`} />
              <Row label="Sample std-dev" value={`±${((cf.sensingRaw.stdDevRgb.r + cf.sensingRaw.stdDevRgb.g + cf.sensingRaw.stdDevRgb.b) / 3).toFixed(1)}`} />

              <p className="mb-2 mt-4 text-[11px] font-bold uppercase tracking-wide text-ink-400">Reference correction</p>
              <Row label="Reference RGB" value={`${cf.referenceRaw.meanRgb.r.toFixed(0)}, ${cf.referenceRaw.meanRgb.g.toFixed(0)}, ${cf.referenceRaw.meanRgb.b.toFixed(0)}`} />
              <Row label="Applied ΔL / Δa / Δb" value={`${cf.correctionApplied.dL.toFixed(2)} / ${cf.correctionApplied.da.toFixed(2)} / ${cf.correctionApplied.db.toFixed(2)}`} />

              <p className="mb-2 mt-4 text-[11px] font-bold uppercase tracking-wide text-ink-400">CIE L*a*b* (corrected sensing patch)</p>
              <Row label="L*" value={cf.sensingCorrected.L.toFixed(2)} />
              <Row label="a*" value={cf.sensingCorrected.a.toFixed(2)} />
              <Row label="b*" value={cf.sensingCorrected.b.toFixed(2)} />
              <Row label="ΔL* / Δa* / Δb*" value={`${cf.deltaL.toFixed(2)} / ${cf.deltaA.toFixed(2)} / ${cf.deltaB.toFixed(2)}`} />
              <Row label="ΔE2000 (vs. pristine baseline)" value={cf.deltaE2000.toFixed(3)} />

              <p className="mb-2 mt-4 text-[11px] font-bold uppercase tracking-wide text-ink-400">Region detection</p>
              <Row label="Method" value={measurement.regionDetection.method} />
              <Row label="Sensing confidence" value={`${((measurement.regionDetection.sensing?.confidence ?? 0) * 100).toFixed(0)}%`} />
              <Row label="Reference confidence" value={`${((measurement.regionDetection.reference?.confidence ?? 0) * 100).toFixed(0)}%`} />
              <Row label="Expiry confidence" value={`${((measurement.regionDetection.expiry?.confidence ?? 0) * 100).toFixed(0)}%`} />

              <p className="mb-2 mt-4 text-[11px] font-bold uppercase tracking-wide text-ink-400">Image quality metrics</p>
              <Row label="Sharpness (Laplacian var.)" value={measurement.imageQuality.sharpness.toFixed(1)} />
              <Row label="Brightness (mean luma)" value={measurement.imageQuality.brightness.toFixed(1)} />
              <Row label="Glare ratio" value={`${(measurement.imageQuality.glareRatio * 100).toFixed(1)}%`} />
              <Row label="Clipping ratio" value={`${(measurement.imageQuality.clippingRatio * 100).toFixed(1)}%`} />
              <Row label="Framing ratio" value={`${(measurement.imageQuality.framingRatio * 100).toFixed(0)}%`} />

              <p className="mb-2 mt-4 text-[11px] font-bold uppercase tracking-wide text-ink-400">Calibration &amp; uncertainty</p>
              <Row label="Model version" value={measurement.calibrationModelVersion} />
              <Row label="Simulated" value={measurement.isSimulated ? 'Yes' : 'No'} />
              {measurement.dose && (
                <Row label="Confidence score" value={`${(measurement.dose.confidenceScore * 100).toFixed(0)}%`} />
              )}
            </>
          ) : (
            <p className="text-xs text-ink-500">
              No colour features were computed for this record — image quality or badge validity
              gated the measurement before colour analysis ran.
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
