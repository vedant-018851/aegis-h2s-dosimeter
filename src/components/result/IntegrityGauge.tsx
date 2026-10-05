import type { MeasurementIntegrity } from '../../types';
import { Card, CardHeader } from '../common/Card';
import { integrityTone } from '../../utils/format';
import { INTEGRITY_LABEL } from '../../data/constants';

const BAR_COLORS: Record<string, string> = {
  good: 'bg-emerald-500',
  warn: 'bg-amber-500',
  bad: 'bg-red-500',
  neutral: 'bg-ink-400',
};

export function IntegrityGauge({ integrity }: { integrity: MeasurementIntegrity }) {
  const tone = integrityTone(integrity.score);
  const rows: Array<[string, number]> = [
    ['Image quality', integrity.breakdown.imageQuality],
    ['Reference quality', integrity.breakdown.referenceQuality],
    ['Region quality', integrity.breakdown.regionQuality],
    ['Badge validity', integrity.breakdown.badgeValidity],
    ['Calibration applicability', integrity.breakdown.calibrationApplicability],
  ];

  return (
    <Card>
      <CardHeader title="Measurement Integrity" subtitle={INTEGRITY_LABEL} />
      <div className="flex items-center gap-4">
        <div className="tabular text-3xl font-bold text-ink-900">{integrity.score}</div>
        <div className="flex-1">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-ink-100">
            <div className={`h-full rounded-full ${BAR_COLORS[tone]}`} style={{ width: `${integrity.score}%` }} />
          </div>
        </div>
        <span className="text-xs text-ink-400">/ 100</span>
      </div>

      <div className="mt-4 space-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center gap-3 text-xs">
            <span className="w-40 shrink-0 text-ink-500">{label}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-100">
              <div className="h-full rounded-full bg-ink-400" style={{ width: `${value}%` }} />
            </div>
            <span className="tabular w-8 text-right font-medium text-ink-700">{value}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
