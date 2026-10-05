import { useState } from 'react';
import type { CalibrationSample } from '../../types';
import { Button } from '../common/Button';
import { PRISTINE_SILVER_LAB } from '../../data/constants';
import { deltaE2000 } from '../../services/colorScience';

interface CalibrationSampleFormProps {
  onSubmit: (sample: CalibrationSample) => void;
  onCancel: () => void;
}

export function CalibrationSampleForm({ onSubmit, onCancel }: CalibrationSampleFormProps) {
  const [concentration, setConcentration] = useState(20);
  const [duration, setDuration] = useState(20);
  const [L, setL] = useState(PRISTINE_SILVER_LAB.L);
  const [a, setA] = useState(PRISTINE_SILVER_LAB.a);
  const [b, setB] = useState(PRISTINE_SILVER_LAB.b);
  const [temperature, setTemperature] = useState(25);
  const [humidity, setHumidity] = useState(50);
  const [batch, setBatch] = useState('AG-BATCH-LAB-01');
  const [device, setDevice] = useState('');

  const dE = deltaE2000(PRISTINE_SILVER_LAB, { L, a, b });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sample: CalibrationSample = {
      id: `CAL-LAB-${Date.now()}`,
      knownConcentrationPpm: concentration,
      exposureDurationHours: duration,
      doseKnown: concentration * duration,
      lab: { L, a, b },
      deltaL: L - PRISTINE_SILVER_LAB.L,
      deltaA: a - PRISTINE_SILVER_LAB.a,
      deltaB: b - PRISTINE_SILVER_LAB.b,
      deltaE2000: dE,
      temperatureC: temperature,
      humidityPct: humidity,
      stripBatch: batch,
      device: device || 'Unspecified',
      isDemo: false,
      createdAt: Date.now(),
    };
    onSubmit(sample);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-xs text-ink-500">
        For entering a real controlled-exposure lab reading once available. Dose and ΔE2000 are computed
        automatically from the fields below.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <NumField label="Concentration (ppm)" value={concentration} onChange={setConcentration} />
        <NumField label="Duration (hours)" value={duration} onChange={setDuration} />
        <NumField label="L*" value={L} onChange={setL} step={0.1} />
        <NumField label="a*" value={a} onChange={setA} step={0.1} />
        <NumField label="b*" value={b} onChange={setB} step={0.1} />
        <NumField label="Temperature (°C)" value={temperature} onChange={setTemperature} step={0.1} />
        <NumField label="Humidity (%)" value={humidity} onChange={setHumidity} />
      </div>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-ink-600">Strip batch</span>
        <input value={batch} onChange={(e) => setBatch(e.target.value)} className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm" />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-ink-600">Camera / device</span>
        <input
          value={device}
          onChange={(e) => setDevice(e.target.value)}
          placeholder="e.g. Pixel-7-Camera"
          className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm"
        />
      </label>

      <div className="rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-600">
        Computed dose: <strong>{concentration * duration} ppm·h</strong> · Computed ΔE2000:{' '}
        <strong>{dE.toFixed(3)}</strong>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary">
          Add sample
        </Button>
      </div>
    </form>
  );
}

function NumField({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-ink-600">{label}</span>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm"
      />
    </label>
  );
}
