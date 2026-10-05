import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { storageService } from '../services/storage';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import type { Measurement } from '../types';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { ResultView } from '../components/result/ResultView';
import { formatDateTime } from '../utils/format';

export function MeasurementDetailPage() {
  const { measurementId } = useParams();
  const navigate = useNavigate();
  const { refreshMeasurements } = useAppContext();
  const { session } = useAuth();
  const [measurement, setMeasurement] = useState<Measurement | null | undefined>(undefined);
  const [accessDenied, setAccessDenied] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!measurementId) return;
    setMeasurement(undefined);
    setAccessDenied(false);
    storageService.getMeasurement(measurementId).then((record) => {
      if (
        record &&
        session?.role === 'worker' &&
        (!session.workerId || record.workerId !== session.workerId)
      ) {
        setAccessDenied(true);
        setMeasurement(null);
        return;
      }
      setMeasurement(record);
    });
  }, [measurementId, session]);

  if (measurement === undefined) {
    return <p className="text-sm text-ink-500">Loading…</p>;
  }
  if (measurement === null) {
    return (
      <Card className="text-center text-sm text-ink-500">
        {accessDenied ? 'This measurement is not available for your account.' : 'Record not found.'}
        <div className="mt-3">
          <Button variant="secondary" onClick={() => navigate('/history')}>
            Back to history
          </Button>
        </div>
      </Card>
    );
  }

  const handleDelete = async () => {
    setDeleteError(null);
    try {
      await storageService.deleteMeasurement(measurement.id);
      await refreshMeasurements();
      navigate('/history');
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'This measurement cannot be deleted.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/history')} className="flex items-center gap-1.5 text-xs font-semibold text-ink-500">
          <ArrowLeft size={14} /> Back to history
        </button>
        {(measurement.isDemo || measurement.status !== 'accepted') ? (
          <button onClick={handleDelete} className="flex items-center gap-1.5 text-xs font-semibold text-red-500">
            <Trash2 size={13} /> Delete
          </button>
        ) : (
          <span className="text-[11px] font-semibold text-ink-400">Traceability record · deletion disabled</span>
        )}
      </div>

      <p className="text-xs text-ink-400">Recorded {formatDateTime(measurement.timestamp)} · {measurement.wristbandId ?? '—'}</p>
      {deleteError && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{deleteError}</div>}

      <ResultView measurement={measurement} onRetake={() => navigate('/scan')} />
    </div>
  );
}
