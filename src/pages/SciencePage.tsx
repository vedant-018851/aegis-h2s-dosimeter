import { Card, CardHeader } from '../components/common/Card';
import {
  SIMULATED_RESULT_LABEL,
  SAFETY_DISCLAIMER,
  CLASP_RELEASE_FORCE_NOTE,
  BAND_ID_PRIVACY_NOTE,
  TEMP_RH_PLANNED_NOTE,
} from '../data/constants';

const STEPS: [string, string][] = [
  ['1. H₂S exposure', 'The worker is exposed to ambient hydrogen sulfide over the course of a shift.'],
  ['2. Ag sensing strip reacts', 'A thin silver (Ag) foil reacts with H₂S to form silver sulfide (Ag₂S): 2Ag + H₂S → Ag₂S + H₂. The strip darkens as more H₂S reaches it, so darkness tracks cumulative exposure.'],
  ['3. Smartphone image capture', 'The phone camera photographs the wristband, or a photo is uploaded — no dedicated hardware is required.'],
  ['4. Image quality validation', 'Blur, brightness, glare, clipping and framing are checked first; a poor image is rejected rather than guessed at.'],
  ['5. Region / reference detection', 'The sensing strip, a fixed neutral/grey reference patch and the expiry indicator are located by wristband layout (image/layout-based, not a trained object detector).'],
  ['6. Reference correction', 'The grey patch has a known target colour. The difference between what the camera saw and the target is used as an experimental lighting correction — it does not remove all camera or lighting variability.'],
  ['7. RGB → XYZ → CIE Lab', 'sRGB is converted to XYZ and then to CIE Lab, where colour distances are closer to what the eye perceives.'],
  ['8. CIEDE2000 / ΔE2000', 'CIEDE2000 measures how far the corrected strip colour is from the unexposed-silver baseline.'],
  ['9. Calibration model', 'A calibration model maps ΔE2000 to a dose in ppm·h with an uncertainty range. The model is swappable — see Architecture.'],
  ['10. Dose range + confidence', 'The model returns a dose estimate, a lower/upper bound and a confidence label driven by a prototype measurement-integrity score.'],
  ['11. Local record / export', 'The reading is stored on-device in IndexedDB and can be exported as CSV or JSON at any time.'],
];

const IMPLEMENTED = [
  'Image capture and image upload',
  'Pixel-level image processing',
  'Image-quality checks (blur, brightness, glare, clipping, framing)',
  'Region detection (sensing strip, reference patch, expiry indicator)',
  'Reference-patch correction',
  'RGB → XYZ → CIE Lab conversion',
  'CIEDE2000 (ΔE2000) calculation',
  'Prototype calibration model',
  'Dose range calculation',
  'Measurement integrity score',
  'Local storage (IndexedDB)',
  'History, and CSV / JSON export',
];

const PLANNED = [
  'Controlled H₂S chamber calibration',
  'Validated ΔE2000 → ppm·h relationship',
  'Multi-condition temperature/RH calibration',
  'Statistically validated confidence intervals',
  'Field validation',
  'Occupational deployment validation',
];

const WRISTBAND_TERMS: [string, string][] = [
  ['Ag / Ag₂S reactive sensing strip', 'Darkens irreversibly and cumulatively on exposure to H₂S.'],
  ['Fixed neutral / grey reference patch', 'Known target colour used for lighting correction at read time.'],
  ['Expiry indicator', 'Marks the wristband as past its usable window.'],
  ['ePTFE protective sensing window', 'Lets gas through to the strip while keeping out dust, liquids and fingerprints.'],
  ['Breakaway clasp', CLASP_RELEASE_FORCE_NOTE],
  ['QR / band ID', BAND_ID_PRIVACY_NOTE],
];

export function SciencePage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-ink-900">How It Works</h1>
        <p className="text-xs text-ink-500">Passive Ag / Ag₂S colorimetric dosimetry read by smartphone — Aegis H₂S</p>
      </div>

      <Card>
        <CardHeader title="Pipeline" />
        <ol className="space-y-3">
          {STEPS.map(([t, d]) => (
            <li key={t} className="flex gap-3">
              <div>
                <p className="text-sm font-semibold text-ink-900">{t}</p>
                <p className="text-xs leading-relaxed text-ink-600">{d}</p>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader title="Implemented now" />
          <ul className="list-disc space-y-1 pl-4 text-xs text-ink-700">
            {IMPLEMENTED.map((i) => <li key={i}>{i}</li>)}
          </ul>
        </Card>
        <Card className="border-amber-300 bg-amber-50">
          <CardHeader title="Planned / requires validation" />
          <ul className="list-disc space-y-1 pl-4 text-xs text-amber-900">
            {PLANNED.map((i) => <li key={i}>{i}</li>)}
          </ul>
          <p className="mt-2 text-[11px] font-bold text-amber-900">{SIMULATED_RESULT_LABEL}</p>
        </Card>
      </div>

      <Card>
        <CardHeader title="Wristband" subtitle="Physical product terminology" />
        <dl className="grid gap-3 sm:grid-cols-2">
          {WRISTBAND_TERMS.map(([term, def]) => (
            <div key={term}>
              <dt className="text-xs font-semibold text-ink-900">{term}</dt>
              <dd className="text-xs text-ink-500">{def}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-[11px] text-ink-500">{TEMP_RH_PLANNED_NOTE}</p>
      </Card>

      <Card className="border-ink-300 bg-ink-50">
        <CardHeader title="Safety boundary" />
        <p className="text-xs leading-relaxed text-ink-700">{SAFETY_DISCLAIMER}</p>
      </Card>
    </div>
  );
}
