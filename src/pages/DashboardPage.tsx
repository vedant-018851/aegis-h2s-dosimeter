import { useNavigate } from 'react-router-dom';
import { ScanLine, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABEL } from '../data/roleAccess';
import { useAppContext } from '../context/AppContext';
import { Card, CardHeader } from '../components/common/Card';
import { StatusPill, DisclaimerTag } from '../components/common/StatusPill';
import { Button } from '../components/common/Button';
import { ExposureLineChart } from '../components/charts/ExposureLineChart';
import { MeasurementListItem } from '../components/history/MeasurementListItem';
import { confidenceTone, exposureCategoryLabel, exposureCategoryTone, formatRelativeShort } from '../utils/format';
import { DEMO_DISCLAIMER, CALIBRATION_STATUS_LABEL } from '../data/constants';

export function DashboardPage() {
  const { activeWorker, activeShift, workers, measurements, setActiveWorkerId } = useAppContext();
  const navigate = useNavigate();
  const { session } = useAuth();

  const workerMeasurements = measurements.filter((m) => m.workerId === activeWorker?.id);
  const latest = workerMeasurements.find((m) => m.status === 'accepted' && m.dose) ?? null;
  const recent = workerMeasurements.slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-ink-900">Dashboard</h1>
          <p className="text-xs text-ink-500">{session ? `${ROLE_LABEL[session.role]} view · ${session.name}` : 'Passive H₂S exposure overview'}</p>
        </div>
        <Button variant="primary" size="md" icon={<ScanLine size={16} />} onClick={() => navigate('/scan')}>
          {session?.role === 'safety_officer' ? 'Verify Wristband QR' : 'Scan Wristband'}
        </Button>
      </div>

      <Card>
        <CardHeader
          title="Current Shift"
          action={
            <button
              onClick={() => navigate('/workers')}
              className="flex items-center gap-1 text-xs font-semibold text-accent-600"
            >
              <Users size={13} /> Switch
            </button>
          }
        />
        {activeWorker ? (
          <div className="space-y-1.5 text-sm">
            <Row label="Worker" value={`${activeWorker.name} (${activeWorker.id})`} />
            <Row label="Role" value={activeWorker.role} />
            <Row label="Shift" value={activeShift ? activeShift.label : 'No active shift'} />
            <Row label="Wristband" value={activeShift?.wristbandId ?? activeWorker.wristbandId ?? '—'} />
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm text-ink-500">No worker selected.</p>
            <select
              className="rounded-lg border border-ink-200 px-2 py-1 text-xs"
              onChange={(e) => setActiveWorkerId(e.target.value || null)}
              defaultValue=""
            >
              <option value="" disabled>
                Select worker
              </option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Latest Reading" subtitle={latest?.dose ? CALIBRATION_STATUS_LABEL : undefined} />
        {latest?.dose ? (
          <div>
            <div className="flex items-end gap-2">
              <span className="tabular text-4xl font-bold text-ink-900">{latest.dose.doseEstimate}</span>
              <span className="mb-1 text-sm font-medium text-ink-500">ppm·h</span>
            </div>
            <p className="tabular mt-1 text-xs text-ink-500">
              Range {latest.dose.lowerBound}–{latest.dose.upperBound} ppm·h
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusPill tone={confidenceTone(latest.dose.confidenceLabel)}>{latest.dose.confidenceLabel} confidence</StatusPill>
              <StatusPill tone={exposureCategoryTone(latest.dose.category)}>{exposureCategoryLabel(latest.dose.category)}</StatusPill>
              <StatusPill tone="good">Badge VALID</StatusPill>
              {latest.isSimulated && <DisclaimerTag>SIMULATED</DisclaimerTag>}
            </div>
            <p className="mt-2 text-[11px] text-ink-400">{formatRelativeShort(latest.timestamp)}</p>
          </div>
        ) : (
          <p className="text-sm text-ink-500">No accepted readings yet for this worker.</p>
        )}
      </Card>

      <Card>
        <CardHeader title="Exposure Trend" subtitle={DEMO_DISCLAIMER} />
        <ExposureLineChart measurements={workerMeasurements} />
      </Card>

      <Card>
        <CardHeader title="Recent Measurements" />
        {recent.length === 0 ? (
          <p className="text-sm text-ink-500">No measurements recorded yet.</p>
        ) : (
          <div className="divide-y divide-ink-100">
            {recent.map((m) => (
              <MeasurementListItem key={m.id} measurement={m} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-500">{label}</span>
      <span className="font-semibold text-ink-900">{value}</span>
    </div>
  );
}
