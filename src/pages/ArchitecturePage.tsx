import { ArrowDown } from 'lucide-react';
import { Card, CardHeader } from '../components/common/Card';

const LAYERS: { name: string; note: string }[] = [
  { name: 'Physical layer', note: 'Passive Ag/Ag₂S sensing strip, fixed grey reference patch, expiry indicator, ePTFE window' },
  { name: 'Smartphone layer', note: 'Camera capture or image upload — no dedicated hardware required' },
  { name: 'Image processing', note: 'Quality checks + layout-based region detection' },
  { name: 'Colour science', note: 'Reference correction → RGB → XYZ → CIE Lab → ΔE2000' },
  { name: 'Calibration', note: 'Prototype / demo model (swappable — see below)' },
  { name: 'Measurement integrity', note: 'Dose range + confidence, from a prototype quality score' },
  { name: 'Local storage', note: 'IndexedDB — workers, wristbands, shifts, measurements, calibration samples' },
  { name: 'History / dashboard / export', note: 'Worker history, trends, CSV / JSON export' },
];

const FUTURE_LAYER = [
  'Controlled H₂S laboratory calibration',
  'Multi-condition testing',
  'Validated calibration model',
  'Field / industrial pilot',
  'Optional backend / sync',
];

export function ArchitecturePage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-ink-900">System Architecture</h1>
        <p className="text-xs text-ink-500">Offline-first: everything above the dashed box runs on-device, today.</p>
      </div>
      <Card>
        <CardHeader title="Data flow" />
        <div className="mx-auto max-w-md">
          {LAYERS.map((l, i) => (
            <div key={l.name}>
              <div className="rounded-xl border border-ink-200 bg-white px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-ink-400">{l.name}</p>
                <p className="text-sm font-semibold text-ink-900">{l.note}</p>
              </div>
              <div className="flex justify-center py-1 text-ink-400"><ArrowDown size={16} aria-hidden /></div>
            </div>
          ))}
          <div className="rounded-xl border-2 border-dashed border-ink-400 bg-ink-50 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-ink-500">Future / validation layer — not yet implemented</p>
            <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-sm font-medium text-ink-700">
              {FUTURE_LAYER.map((i) => <li key={i}>{i}</li>)}
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
