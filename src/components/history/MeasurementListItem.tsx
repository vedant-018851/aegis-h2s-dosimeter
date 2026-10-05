import { useNavigate } from 'react-router-dom';
import { ChevronRight, ImageOff } from 'lucide-react';
import type { Measurement } from '../../types';
import { StatusPill } from '../common/StatusPill';
import { confidenceTone, expiryLabel, expiryTone, formatDateTime } from '../../utils/format';

export function MeasurementListItem({ measurement }: { measurement: Measurement }) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(`/history/${measurement.id}`)}
      className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-ink-50"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-ink-100 text-ink-400">
        {measurement.thumbnailDataUrl ? (
          <img src={measurement.thumbnailDataUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <ImageOff size={16} />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="tabular text-sm font-semibold text-ink-900">
            {measurement.status === 'accepted' && measurement.dose
              ? `${measurement.dose.doseEstimate} ppm·h`
              : measurement.status === 'expired_badge'
                ? 'Badge expired'
                : 'Rejected'}
          </p>
          {measurement.isDemo && (
            <span className="rounded bg-ink-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-ink-500">
              Demo
            </span>
          )}
        </div>
        <p className="truncate text-xs text-ink-500">{formatDateTime(measurement.timestamp)} · {measurement.wristbandId ?? '—'}</p>
      </div>

      <div className="hidden sm:block">
        {measurement.status === 'accepted' && measurement.dose ? (
          <StatusPill tone={confidenceTone(measurement.dose.confidenceLabel)}>{measurement.dose.confidenceLabel}</StatusPill>
        ) : (
          <StatusPill tone={expiryTone(measurement.expiry.status)}>{expiryLabel(measurement.expiry.status)}</StatusPill>
        )}
      </div>
      <ChevronRight size={16} className="shrink-0 text-ink-300" />
    </button>
  );
}
