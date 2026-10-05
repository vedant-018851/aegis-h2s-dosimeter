import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Play, Square, Pencil } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Card, CardHeader } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { WorkerForm } from '../components/workers/WorkerForm';
import { ExposureLineChart } from '../components/charts/ExposureLineChart';
import { MeasurementListItem } from '../components/history/MeasurementListItem';
import { formatDateTime } from '../utils/format';
import { storageService } from '../services/storage';
import type { Worker } from '../types';

export function WorkerDetailPage() {
  const { workerId } = useParams();
  const navigate = useNavigate();
  const { workers, shifts, measurements, startShift, endShift, refreshWorkers, setActiveWorkerId, activeWorkerId } =
    useAppContext();
  const [editing, setEditing] = useState(false);
  const [shiftLabel, setShiftLabel] = useState('Morning');
  const [shiftError, setShiftError] = useState<string | null>(null);

  const worker = workers.find((w) => w.id === workerId);
  if (!worker) {
    return (
      <div className="text-center text-sm text-ink-500">
        Worker not found.
        <div className="mt-3">
          <Button variant="secondary" onClick={() => navigate('/workers')}>
            Back to workers
          </Button>
        </div>
      </div>
    );
  }

  const activeShift = shifts.find((s) => s.workerId === worker.id && s.status === 'active') ?? null;
  const workerMeasurements = measurements.filter((m) => m.workerId === worker.id);
  const latest = workerMeasurements.find((m) => m.status === 'accepted' && m.dose) ?? null;

  const handleUpdate = async (data: Omit<Worker, 'createdAt' | 'updatedAt' | 'isDemo'>) => {
    await storageService.putWorker({ ...worker, ...data, updatedAt: Date.now() });
    await refreshWorkers();
    setEditing(false);
  };

  return (
    <div className="space-y-4">
      <button onClick={() => navigate('/workers')} className="flex items-center gap-1.5 text-xs font-semibold text-ink-500">
        <ArrowLeft size={14} /> Back to workers
      </button>

      <Card>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-800 text-base font-bold text-white">
              {worker.name.charAt(0)}
            </span>
            <div>
              <p className="text-base font-bold text-ink-900">{worker.name}</p>
              <p className="text-xs text-ink-500">
                {worker.role} · {worker.department} · {worker.id}
              </p>
            </div>
          </div>
          <button onClick={() => setEditing(true)} className="rounded-lg p-2 text-ink-400 hover:bg-ink-100">
            <Pencil size={15} />
          </button>
        </div>

        {activeWorkerId !== worker.id && (
          <Button variant="secondary" size="sm" className="mt-4" onClick={() => setActiveWorkerId(worker.id)}>
            Set as active worker
          </Button>
        )}
      </Card>

      <Card>
        <CardHeader title="Current Shift" />
        {shiftError && <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{shiftError}</p>}
        {activeShift ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-500">Shift</span>
              <span className="font-semibold text-ink-900">{activeShift.label}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-500">Wristband</span>
              <span className="font-semibold text-ink-900">{activeShift.wristbandId}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-500">Started</span>
              <span className="font-semibold text-ink-900">{formatDateTime(activeShift.startedAt)}</span>
            </div>
            <Button variant="danger" size="sm" icon={<Square size={13} />} className="mt-2" onClick={() => endShift(activeShift.id)}>
              End shift
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-ink-500">No active shift.</p>
            <div className="flex items-center gap-2">
              <select
                value={shiftLabel}
                onChange={(e) => setShiftLabel(e.target.value)}
                className="rounded-lg border border-ink-200 px-2 py-2 text-sm"
              >
                <option>Morning</option>
                <option>Afternoon</option>
                <option>Night</option>
              </select>
              <Button
                variant="primary"
                size="sm"
                icon={<Play size={13} />}
                disabled={!worker.wristbandId}
                onClick={async () => {
                  if (!worker.wristbandId) return;
                  setShiftError(null);
                  try {
                    await startShift(worker.id, worker.wristbandId, shiftLabel);
                  } catch (err) {
                    setShiftError(err instanceof Error ? err.message : 'Could not start the shift.');
                  }
                }}
              >
                Start shift
              </Button>
            </div>
            {!worker.wristbandId && <p className="text-xs text-amber-600">Assign a wristband to this worker first.</p>}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Latest Measurement" />
        {latest?.dose ? (
          <div className="flex items-end gap-2">
            <span className="tabular text-3xl font-bold text-ink-900">{latest.dose.doseEstimate}</span>
            <span className="mb-1 text-sm text-ink-500">ppm·h</span>
          </div>
        ) : (
          <p className="text-sm text-ink-500">No accepted measurements yet.</p>
        )}
      </Card>

      <Card>
        <CardHeader title="Exposure Trend" />
        <ExposureLineChart measurements={workerMeasurements} />
      </Card>

      <Card>
        <CardHeader title="Historical Measurements" />
        {workerMeasurements.length === 0 ? (
          <p className="text-sm text-ink-500">No measurements yet.</p>
        ) : (
          <div className="divide-y divide-ink-100">
            {workerMeasurements.map((m) => (
              <MeasurementListItem key={m.id} measurement={m} />
            ))}
          </div>
        )}
      </Card>

      <Modal open={editing} title="Edit Worker" onClose={() => setEditing(false)}>
        <WorkerForm initial={worker} onSubmit={handleUpdate} onCancel={() => setEditing(false)} />
      </Modal>
    </div>
  );
}
