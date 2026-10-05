import { useEffect, useState } from 'react';
import { Plus, ShieldQuestion } from 'lucide-react';
import { Card, CardHeader } from '../components/common/Card';
import { DisclaimerTag } from '../components/common/StatusPill';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { CalibrationSampleForm } from '../components/charts/CalibrationSampleForm';
import { CalibrationTable } from '../components/charts/CalibrationTable';
import { DoseResponseChart, ColorResponseChart } from '../components/charts/CalibrationCharts';
import { storageService } from '../services/storage';
import { seedDemoData } from '../data/seedDemoData';
import { DEMO_CALIBRATION_PARAMS } from '../services/calibrationModel';
import type { CalibrationSample } from '../types';
import { DEMO_CALIBRATION_LABEL, TEMP_RH_PLANNED_NOTE } from '../data/constants';

export function CalibrationPage() {
  const [samples, setSamples] = useState<CalibrationSample[]>([]);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    try {
      await seedDemoData();
      setSamples(await storageService.listCalibrationSamples());
    } catch {
      setSamples([]);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAdd = async (sample: CalibrationSample) => {
    await storageService.putCalibrationSample(sample);
    setSamples(await storageService.listCalibrationSamples());
    setShowForm(false);
  };

  const demoCount = samples.filter((s) => s.isDemo).length;
  const labCount = samples.length - demoCount;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-ink-900">Calibration</h1>
          <p className="text-xs text-ink-500">Admin section — not worker-facing</p>
        </div>
        <Button variant="primary" icon={<Plus size={15} />} onClick={() => setShowForm(true)}>
          Add sample
        </Button>
      </div>

      <Card className="flex items-start gap-3 border-amber-200 bg-amber-50">
        <ShieldQuestion size={18} className="mt-0.5 shrink-0 text-amber-700" />
        <p className="text-xs leading-relaxed text-amber-800">
          This dataset is intended for future controlled H₂S laboratory calibration. It currently contains{' '}
          <strong>{demoCount} synthetic demo rows</strong>
          {labCount > 0 && (
            <>
              {' '}and <strong>{labCount} manually entered rows</strong>
            </>
          )}
          . No row here should be treated as a validated laboratory measurement unless produced under
          controlled chamber conditions.
        </p>
      </Card>

      <Card className="grid gap-2 border-ink-200 bg-ink-50 sm:grid-cols-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-ink-400">Current model</p>
          <p className="text-sm font-semibold text-ink-900">DEMO / SIMULATED</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-ink-400">Future model</p>
          <p className="text-sm font-semibold text-ink-900">Controlled H₂S laboratory calibration</p>
        </div>
        <p className="text-xs text-ink-500 sm:col-span-2">
          Real chamber data will replace this illustrative model without any app changes — the calibration
          model is a swappable component (see Architecture). {TEMP_RH_PLANNED_NOTE}
        </p>
      </Card>

      <Card>
        <CardHeader
          title="Active Model"
          subtitle={DEMO_CALIBRATION_PARAMS.isSimulated ? 'Prototype calibration model — simulated parameters' : 'Calibration-ready model'}
          action={<DisclaimerTag>{DEMO_CALIBRATION_LABEL}</DisclaimerTag>}
        />
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Stat label="Version" value={DEMO_CALIBRATION_PARAMS.version} />
          <Stat label="ΔE max" value={DEMO_CALIBRATION_PARAMS.deltaEMax.toFixed(1)} />
          <Stat label="D50 (ppm·h)" value={String(DEMO_CALIBRATION_PARAMS.d50)} />
          <Stat label="Base uncertainty" value={`±${(DEMO_CALIBRATION_PARAMS.baseUncertaintyFraction * 100).toFixed(0)}%`} />
        </div>
        <p className="mt-3 text-xs text-ink-500">{DEMO_CALIBRATION_PARAMS.notes}</p>
      </Card>

      <Card>
        <CardHeader title="Dose-Response Curve" subtitle="ΔE2000 vs. known cumulative dose" />
        <DoseResponseChart samples={samples} />
      </Card>

      <Card>
        <CardHeader title="Colour-Response" subtitle="ΔL* / Δa* / Δb* vs. known cumulative dose" />
        <ColorResponseChart samples={samples} />
      </Card>

      <Card padded={false} className="overflow-hidden">
        <div className="p-4 sm:p-5">
          <CardHeader title="Calibration Dataset" action={<DisclaimerTag>{DEMO_CALIBRATION_LABEL}</DisclaimerTag>} />
        </div>
        <div className="px-1 pb-4 sm:px-2">
          <CalibrationTable samples={samples} />
        </div>
      </Card>

      <Modal open={showForm} title="Add Calibration Sample" onClose={() => setShowForm(false)}>
        <CalibrationSampleForm onSubmit={handleAdd} onCancel={() => setShowForm(false)} />
      </Modal>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-ink-50 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">{label}</p>
      <p className="tabular mt-0.5 text-sm font-bold text-ink-900">{value}</p>
    </div>
  );
}
