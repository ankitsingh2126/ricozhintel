// Bar chart of average KPI progress (%) grouped by department.

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

// Compute average progress per department from the KPI list.
const groupByDepartment = (kpis) => {
  const groups = {};
  kpis.forEach((k) => {
    const deptName = k.department?.name || 'Unknown';
    const progress = k.target > 0
      ? Math.min(150, Math.round((k.currentValue / k.target) * 100))
      : 0;
    if (!groups[deptName]) groups[deptName] = { name: deptName, total: 0, count: 0 };
    groups[deptName].total += progress;
    groups[deptName].count += 1;
  });

  return Object.values(groups).map((g) => ({
    name: g.name,
    progress: Math.round(g.total / g.count),
  }));
};

export default function DepartmentProgressChart({ kpis }) {
  const data = groupByDepartment(kpis || []);

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <h3 className="font-medium text-slate-900 mb-4">Average Progress by Department</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} unit="%" />
            <Tooltip formatter={(v) => `${v}%`} />
            <Bar dataKey="progress" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
