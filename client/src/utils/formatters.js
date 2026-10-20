// Small formatting helpers used across the app.

export const formatNumber = (n) => {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '—';
  return new Intl.NumberFormat('en-US').format(n);
};

export const formatPercent = (n) => {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '—';
  return `${Math.round(n)}%`;
};

export const formatDate = (dateString) => {
  if (!dateString) return '—';
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
};

export const CHANGE_TYPE_LABELS = {
  initial: 'Initial Baseline',
  value_update: 'Value Update',
  full_edit: 'Full Edit',
};

export const STATUS_LABELS = {
  on_track: 'On Track',
  at_risk: 'At Risk',
  off_track: 'Off Track',
  completed: 'Completed',
};

export const STATUS_COLORS = {
  on_track:  '#10b981', // emerald
  at_risk:   '#f59e0b', // amber
  off_track: '#ef4444', // red
  completed: '#6366f1', // indigo
};
