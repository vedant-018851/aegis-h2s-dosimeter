import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from 'recharts';
import type { Measurement } from '../../types';

const CATEGORY_COLORS: Record<string, string> = {
  LOW: '#059669',
  MODERATE: '#d97706',
  HIGH: '#dc2626',
  'REVIEW REQUIRED': '#667085',
};

export function ExposureCategoryBarChart({ measurements }: { measurements: Measurement[] }) {
  const counts: Record<string, number> = { LOW: 0, MODERATE: 0, HIGH: 0, 'REVIEW REQUIRED': 0 };
  measurements.forEach((m) => {
    if (m.status !== 'accepted' || !m.dose) return;
    const key = m.dose.category === 'low' ? 'LOW' : m.dose.category === 'moderate' ? 'MODERATE' : m.dose.category === 'high' ? 'HIGH' : 'REVIEW REQUIRED';
    counts[key] += 1;
  });
  const data = Object.entries(counts).map(([category, count]) => ({ category, count }));

  return (
    <div className="h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid stroke="#e4e7ec" vertical={false} />
          <XAxis dataKey="category" tick={{ fontSize: 9, fill: '#667085' }} axisLine={{ stroke: '#e4e7ec' }} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#667085' }} axisLine={false} tickLine={false} width={28} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e4e7ec' }} />
          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
            {data.map((entry) => (
              <Cell key={entry.category} fill={CATEGORY_COLORS[entry.category]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
