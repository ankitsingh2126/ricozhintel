// Simple horizontal progress bar. Caps visual width at 100%.

const COLOR_BY_STATUS = {
  on_track:  'bg-emerald-500',
  at_risk:   'bg-amber-500',
  off_track: 'bg-red-500',
  completed: 'bg-indigo-500',
};

export default function ProgressBar({ value, status = 'on_track' }) {
  const safe = Math.max(0, Math.min(100, Number(value) || 0));
  const color = COLOR_BY_STATUS[status] || 'bg-slate-400';
  return (
    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
      <div className={`h-full ${color} transition-all`} style={{ width: `${safe}%` }} />
    </div>
  );
}
