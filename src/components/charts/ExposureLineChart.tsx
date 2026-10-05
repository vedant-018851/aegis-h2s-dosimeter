import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import type { Measurement } from '../../types';
import { formatDate } from '../../utils/format';

export function ExposureLineChart({ measurements }: { measurements: Measurement[] }) {
  const data = [...measurements]
    .filter((m) => m.status === 'accepted' && m.dose)
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((m) => ({
      date: formatDate(m.timestamp),
      dose: m.dose!.doseEstimate,
      lower: m.dose!.lowerBound,
      upper: m.dose!.upperBound,
    }));

  if (data.length === 0) {
    return <p className="py-8 text-center text-xs text-ink-400">No accepted measurements yet.</p>;
  }

  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
          <CartesianGrid stroke="#e4e7ec" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#667085' }} axisLine={{ stroke: '#e4e7ec' }} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#667085' }} axisLine={false} tickLine={false} width={40} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e4e7ec' }}
            formatter={(value, name) => [`${value} ppm·h`, String(name)]}
          />
          <Line type="monotone" dataKey="upper" stroke="#f59e0b" strokeWidth={0} dot={false} activeDot={false} />
          <Line type="monotone" dataKey="dose" stroke="#d97706" strokeWidth={2.5} dot={{ r: 3, fill: '#d97706' }} name="Dose" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
