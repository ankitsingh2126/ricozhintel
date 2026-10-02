// Bar chart of KPI counts by status.

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import { STATUS_LABELS, STATUS_COLORS } from '../../utils/formatters.js';

export default function StatusBreakdownChart({ byStatus }) {
  const data = Object.entries(byStatus || {}).map(([status, count]) => ({
    status: STATUS_LABELS[status] || status,
    key: status,
    count,
  }));

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <h3 className="font-medium text-slate-900 mb-4">KPIs by Status</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="status" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((entry) => (
                <Cell key={entry.key} fill={STATUS_COLORS[entry.key] || '#94a3b8'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
