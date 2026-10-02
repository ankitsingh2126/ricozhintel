// Single KPI summary card. Used 4× on the dashboard.

import { ArrowUpRight } from 'lucide-react';

const TONE_STYLES = {
  default: 'bg-white border-slate-200 text-slate-900',
  success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
  warning: 'bg-amber-50 border-amber-200 text-amber-900',
  danger:  'bg-red-50 border-red-200 text-red-900',
  info:    'bg-indigo-50 border-indigo-200 text-indigo-900',
};

export default function KpiCard({ label, value, tone = 'default', hint }) {
  const styles = TONE_STYLES[tone] || TONE_STYLES.default;
  return (
    <div className={`rounded-lg border p-4 ${styles}`}>
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium opacity-80">{label}</div>
        <ArrowUpRight size={16} className="opacity-50" />
      </div>
      <div className="mt-2 text-2xl sm:text-3xl font-semibold">{value}</div>
      {hint && <div className="mt-1 text-xs opacity-70">{hint}</div>}
    </div>
  );
}
