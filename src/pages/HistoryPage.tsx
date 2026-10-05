import { useMemo, useState } from 'react';
import { Download, FileJson } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { ExposureLineChart } from '../components/charts/ExposureLineChart';
import { ExposureCategoryBarChart } from '../components/charts/ExposureCategoryBarChart';
import { MeasurementListItem } from '../components/history/MeasurementListItem';
import { exportJsonBackup, exportMeasurementsCsv } from '../services/exportService';
import { storageService } from '../services/storage';

type DateRange = 'all' | '7d' | '30d';
type StatusFilter = 'all' | 'valid' | 'rejected' | 'demo';

export function HistoryPage() {
  const { measurements, workers, wristbands: allWristbands, shifts: allShifts } = useAppContext();
  const { session } = useAuth();
  const isWorker = session?.role === 'worker';
  const workerId = isWorker ? session.workerId : null;

  // Keep Worker history metadata scoped to the authenticated worker.
  const wristbands = useMemo(
    () => (workerId ? allWristbands.filter((wb) => wb.assignedWorkerId === workerId) : isWorker ? [] : allWristbands),
    [allWristbands, workerId, isWorker]
  );
  const shifts = useMemo(
    () => (workerId ? allShifts.filter((shift) => shift.workerId === workerId) : isWorker ? [] : allShifts),
    [allShifts, workerId, isWorker]
  );
  const [workerFilter, setWorkerFilter] = useState<string>('all');
  const [wristbandFilter, setWristbandFilter] = useState<string>('all');
  const [shiftFilter, setShiftFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [range, setRange] = useState<DateRange>('all');

  const filtered = useMemo(() => {
    const cutoff = range === '7d' ? Date.now() - 7 * 86_400_000 : range === '30d' ? Date.now() - 30 * 86_400_000 : 0;
    return measurements.filter((m) => {
      if (workerFilter !== 'all' && m.workerId !== workerFilter) return false;
      if (wristbandFilter !== 'all' && m.wristbandId !== wristbandFilter) return false;
      if (shiftFilter !== 'all' && m.shiftId !== shiftFilter) return false;
      if (m.timestamp < cutoff) return false;
      if (statusFilter === 'valid' && !(m.status === 'accepted' && m.dose)) return false;
      if (statusFilter === 'rejected' && m.status === 'accepted') return false;
      if (statusFilter === 'demo' && !m.isDemo) return false;
      return true;
    });
  }, [measurements, workerFilter, wristbandFilter, shiftFilter, statusFilter, range]);

  const handleExportCsv = () => exportMeasurementsCsv(filtered);
  const handleExportJson = async () => {
    if (isWorker) return;
    exportJsonBackup(await storageService.exportAllJSON());
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-ink-900">History</h1>
          <p className="text-xs text-ink-500">{filtered.length} measurements</p>
        </div>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={workerFilter}
            onChange={(e) => setWorkerFilter(e.target.value)}
            className="rounded-lg border border-ink-200 px-2.5 py-2 text-xs font-medium"
          >
            <option value="all">All workers</option>
            {workers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>

          <select
            value={wristbandFilter}
            onChange={(e) => setWristbandFilter(e.target.value)}
            className="rounded-lg border border-ink-200 px-2.5 py-2 text-xs font-medium"
          >
            <option value="all">All wristbands</option>
            {wristbands.map((wb) => (
              <option key={wb.id} value={wb.id}>
                {wb.id}
              </option>
            ))}
          </select>

          <select
            value={shiftFilter}
            onChange={(e) => setShiftFilter(e.target.value)}
            className="rounded-lg border border-ink-200 px-2.5 py-2 text-xs font-medium"
          >
            <option value="all">All shifts</option>
            {shifts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label} · {s.id}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="rounded-lg border border-ink-200 px-2.5 py-2 text-xs font-medium"
          >
            <option value="all">All statuses</option>
            <option value="valid">Valid only</option>
            <option value="rejected">Rejected / expired</option>
            <option value="demo">Demo / simulated</option>
          </select>

          <div className="flex rounded-lg border border-ink-200 p-0.5">
            {(['all', '7d', '30d'] as DateRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`rounded-md px-2.5 py-1.5 text-xs font-semibold ${
                  range === r ? 'bg-ink-900 text-white' : 'text-ink-500'
                }`}
              >
                {r === 'all' ? 'All time' : r === '7d' ? '7 days' : '30 days'}
              </button>
            ))}
          </div>

          <div className="ml-auto flex gap-2">
            <Button variant="secondary" size="sm" icon={<Download size={13} />} onClick={handleExportCsv}>
              CSV
            </Button>
            {!isWorker && (
              <Button variant="secondary" size="sm" icon={<FileJson size={13} />} onClick={handleExportJson}>
                JSON
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Exposure Trend" />
        <ExposureLineChart measurements={filtered} />
      </Card>

      <Card>
        <CardHeader title="Readings by Category" subtitle="DEMO THRESHOLDS — NOT REGULATORY VALUES" />
        <ExposureCategoryBarChart measurements={filtered} />
      </Card>

      <Card>
        <CardHeader title="Records" />
        {filtered.length === 0 ? (
          <p className="text-sm text-ink-500">No measurements match this filter.</p>
        ) : (
          <div className="divide-y divide-ink-100">
            {filtered.map((m) => (
              <MeasurementListItem key={m.id} measurement={m} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
