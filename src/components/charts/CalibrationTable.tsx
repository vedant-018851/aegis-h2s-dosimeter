import type { CalibrationSample } from '../../types';
import { formatDate } from '../../utils/format';

export function CalibrationTable({ samples }: { samples: CalibrationSample[] }) {
  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <table className="w-full min-w-[720px] text-left text-xs">
        <thead>
          <tr className="border-b border-ink-200 text-[10px] uppercase tracking-wide text-ink-400">
            <th className="py-2 px-3 font-semibold">ID</th>
            <th className="py-2 px-3 font-semibold">Conc. (ppm)</th>
            <th className="py-2 px-3 font-semibold">Duration (h)</th>
            <th className="py-2 px-3 font-semibold">Dose</th>
            <th className="py-2 px-3 font-semibold">L* a* b*</th>
            <th className="py-2 px-3 font-semibold">ΔE2000</th>
            <th className="py-2 px-3 font-semibold">Temp / RH</th>
            <th className="py-2 px-3 font-semibold">Batch</th>
            <th className="py-2 px-3 font-semibold">Device</th>
            <th className="py-2 px-3 font-semibold">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100">
          {samples.map((s) => (
            <tr key={s.id} className="tabular text-ink-700">
              <td className="py-2 px-3 font-medium text-ink-900">{s.id}</td>
              <td className="py-2 px-3">{s.knownConcentrationPpm}</td>
              <td className="py-2 px-3">{s.exposureDurationHours}</td>
              <td className="py-2 px-3 font-semibold">{s.doseKnown}</td>
              <td className="py-2 px-3">
                {s.lab.L.toFixed(1)}, {s.lab.a.toFixed(1)}, {s.lab.b.toFixed(1)}
              </td>
              <td className="py-2 px-3">{s.deltaE2000.toFixed(2)}</td>
              <td className="py-2 px-3">
                {s.temperatureC.toFixed(1)}°C / {s.humidityPct}%
              </td>
              <td className="py-2 px-3">{s.stripBatch}</td>
              <td className="py-2 px-3">{s.device}</td>
              <td className="py-2 px-3">{formatDate(s.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
