import { Check, X, TriangleAlert } from 'lucide-react';
import type { Measurement } from '../../types';
import { Card, CardHeader } from '../common/Card';

type GateState = 'ok' | 'warn' | 'fail';

interface GateItem {
  label: string;
  state: GateState;
  detail?: string;
}

/**
 * Structured measurement-integrity gate display (spec §6): image quality,
 * wristband identity, alignment, reference, sensing region, badge validity
 * and calibration are all shown explicitly, mirroring the internal
 * structured rejection codes without redesigning the result screen.
 */
export function StatusChecklist({ measurement }: { measurement: Measurement }) {
  const items: GateItem[] = [
    {
      label: 'Image quality',
      state: measurement.imageQuality.passed ? 'ok' : 'fail',
    },
    {
      label: 'Wristband identity',
      state:
        measurement.rejectionCode === 'INVALID_WRISTBAND' || measurement.rejectionCode === 'WRISTBAND_ALREADY_USED'
          ? 'fail'
          : measurement.wristbandQrVerified
            ? 'ok'
            : measurement.isDemo
              ? 'warn'
              : 'ok',
      detail: measurement.isDemo
        ? 'Simulated / demo identity'
        : measurement.wristbandQrVerified
          ? 'QR verified'
          : 'Assigned wristband',
    },
    {
      label: 'Alignment',
      state: measurement.rejectionCode === 'ALIGNMENT_FAILED' ? 'fail' : 'ok',
      detail:
        measurement.alignmentMethod === 'aruco'
          ? 'ArUco automatic'
          : measurement.alignmentMethod === 'demo'
            ? 'Demo synthesis'
            : 'Manual guide box',
    },
    {
      label: 'Reference',
      state:
        measurement.regionDetection.reference !== null && measurement.regionDetection.reference.confidence >= 0.35
          ? 'ok'
          : 'fail',
    },
    {
      label: 'Sensing region',
      state:
        measurement.regionDetection.sensing !== null && measurement.regionDetection.sensing.confidence >= 0.35
          ? 'ok'
          : 'fail',
    },
    {
      label: 'Badge validity',
      state:
        measurement.expiry.status === 'valid'
          ? 'ok'
          : measurement.expiry.status === 'expiring_soon'
            ? 'warn'
            : 'fail',
      detail: measurement.expiry.status === 'expiring_soon' ? 'Expiring soon' : undefined,
    },
    {
      label: 'Calibration',
      state: measurement.integrity === null && measurement.status !== 'accepted' ? 'fail' : measurement.isSimulated ? 'warn' : 'ok',
      detail: measurement.isSimulated ? 'DEMO' : undefined,
    },
  ];

  const overallValid = measurement.status === 'accepted' && measurement.dose !== null;

  return (
    <Card>
      <CardHeader title="Measurement Status" />
      <ul className="space-y-2.5">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2.5 text-sm">
            <GateIcon state={item.state} />
            <span className={item.state === 'fail' ? 'text-ink-500' : 'text-ink-800'}>{item.label}</span>
            {item.detail && <span className="text-[11px] text-ink-400">— {item.detail}</span>}
          </li>
        ))}
      </ul>
      <p
        className={`mt-3 text-xs font-bold uppercase tracking-wide ${
          overallValid ? 'text-emerald-600' : 'text-red-600'
        }`}
      >
        {overallValid ? '\u2192 Valid measurement' : '\u2192 No valid measurement — retake required'}
      </p>
    </Card>
  );
}

function GateIcon({ state }: { state: GateState }) {
  if (state === 'ok') {
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
        <Check size={12} />
      </span>
    );
  }
  if (state === 'warn') {
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-600">
        <TriangleAlert size={11} />
      </span>
    );
  }
  return (
    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-red-600">
      <X size={12} />
    </span>
  );
}
