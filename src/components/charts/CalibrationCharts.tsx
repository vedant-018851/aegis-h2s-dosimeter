import {
  CartesianGrid,
  Legend,
  Line,
  ComposedChart,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { CalibrationSample } from '../../types';
import { getActiveModel } from '../../services/calibrationModel';

export function DoseResponseChart({ samples }: { samples: CalibrationSample[] }) {
  const model = getActiveModel();
  const maxDose = Math.max(1600, ...samples.map((s) => s.doseKnown));
  const curve = Array.from({ length: 30 }, (_, i) => {
    const dose = (i / 29) * maxDose;
    return { dose, modelCurve: model.forward(dose) };
  });
  const points = samples.map((s) => ({ dose: s.doseKnown, deltaE2000: s.deltaE2000 }));

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
          <CartesianGrid stroke="#e4e7ec" vertical={false} />
          <XAxis dataKey="dose" type="number" domain={[0, maxDose]} tick={{ fontSize: 10, fill: '#667085' }} name="Dose" unit=" ppm·h" />
          <YAxis dataKey="deltaE2000" tick={{ fontSize: 10, fill: '#667085' }} width={32} name="ΔE2000" />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e4e7ec' }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line data={curve} type="monotone" dataKey="modelCurve" stroke="#d97706" strokeWidth={2} dot={false} name="Model (simulated)" />
          <Scatter data={points} dataKey="deltaE2000" fill="#101828" name="Demo samples" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ColorResponseChart({ samples }: { samples: CalibrationSample[] }) {
  const sorted = [...samples].sort((a, b) => a.doseKnown - b.doseKnown);
  const data = sorted.map((s) => ({ dose: s.doseKnown, deltaL: s.deltaL, deltaA: s.deltaA, deltaB: s.deltaB }));

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
          <CartesianGrid stroke="#e4e7ec" vertical={false} />
          <XAxis dataKey="dose" tick={{ fontSize: 10, fill: '#667085' }} name="Dose" unit=" ppm·h" />
          <YAxis tick={{ fontSize: 10, fill: '#667085' }} width={32} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e4e7ec' }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="deltaL" stroke="#475069" strokeWidth={2} dot={false} name="ΔL*" />
          <Line type="monotone" dataKey="deltaA" stroke="#d97706" strokeWidth={2} dot={false} name="Δa*" />
          <Line type="monotone" dataKey="deltaB" stroke="#059669" strokeWidth={2} dot={false} name="Δb*" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
