// Colored pill for KPI status.

import { STATUS_LABELS } from '../../utils/formatters.js';

const STYLES = {
  on_track:  'bg-emerald-100 text-emerald-800 border-emerald-200',
  at_risk:   'bg-amber-100 text-amber-800 border-amber-200',
  off_track: 'bg-red-100 text-red-800 border-red-200',
  completed: 'bg-indigo-100 text-indigo-800 border-indigo-200',
};

export default function StatusBadge({ status }) {
  const cls = STYLES[status] || 'bg-slate-100 text-slate-700 border-slate-200';
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full border ${cls}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}
