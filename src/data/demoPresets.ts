import type { DemoPreset } from '../types';

export const DEMO_PRESETS: DemoPreset[] = [
  {
    id: 'clean_unexposed',
    label: 'Clean / Unexposed',
    description: 'Fresh wristband, negligible Ag2S conversion. Expect a near-zero dose reading.',
    category: 'exposure',
  },
  {
    id: 'low_exposure',
    label: 'Low simulated exposure',
    description: 'Slight tarnish on the sensing strip — a small ΔE2000 shift from baseline.',
    category: 'exposure',
  },
  {
    id: 'moderate_exposure',
    label: 'Moderate simulated exposure',
    description: 'Visible browning of the strip, mid-range simulated cumulative dose.',
    category: 'exposure',
  },
  {
    id: 'high_exposure',
    label: 'High simulated exposure',
    description: 'Strip close to fully converted to Ag2S — high simulated cumulative dose.',
    category: 'exposure',
  },
  {
    id: 'expired_badge',
    label: 'Expired badge',
    description: 'Expiry indicator reads EXPIRED — quantitative measurement withheld.',
    category: 'failure',
  },
  {
    id: 'blurry_scan',
    label: 'Blurry scan',
    description: 'Out-of-focus capture — the sharpness check should reject this frame.',
    category: 'failure',
  },
  {
    id: 'excessive_glare',
    label: 'Excessive glare',
    description: 'A bright specular reflection covers part of the sensing window.',
    category: 'failure',
  },
  {
    id: 'poor_lighting',
    label: 'Poor lighting',
    description: 'Very dim frame — brightness and framing checks should reject this.',
    category: 'failure',
  },
  {
    id: 'missing_reference',
    label: 'Missing reference',
    description: 'The fixed neutral reference patch is obstructed or unreadable.',
    category: 'failure',
  },
  {
    id: 'invalid_wristband',
    label: 'Invalid wristband',
    description: 'The frame does not contain a recognisable wristband layout.',
    category: 'failure',
  },
];

export function getDemoPreset(id: string): DemoPreset | undefined {
  return DEMO_PRESETS.find((p) => p.id === id);
}
