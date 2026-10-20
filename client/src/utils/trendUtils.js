// Utilities for KPI trend analytics and data transformation.

import { formatDate, CHANGE_TYPE_LABELS } from './formatters.js';

/**
 * Transform and sort history records chronologically for plotting.
 * Only uses real KpiHistory records; never fabricates historical data.
 *
 * @param {Array} items - Array of KpiHistory documents
 * @param {number|null} fallbackTarget - Fallback target value if missing on item
 * @returns {Array} Chronologically sorted chart data points
 */
export function transformTrendData(items = [], fallbackTarget = null) {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  // Sort oldest first (chronological order)
  const sorted = [...items].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  return sorted.map((item, index) => {
    const isBaseline =
      item.changeType === 'initial' || (index === 0 && item.previousValue === 0);
    const itemTarget = item.target != null ? item.target : fallbackTarget;

    // Short date for x-axis ticks (e.g. "Mar 15")
    const d = new Date(item.createdAt);
    const tickLabel = !Number.isNaN(d.getTime())
      ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(d)
      : '—';

    return {
      id: item._id || `point-${index}`,
      rawDate: item.createdAt,
      tickLabel,
      fullDate: formatDate(item.createdAt),
      value: Number(item.newValue),
      previousValue: Number(item.previousValue),
      target: itemTarget != null ? Number(itemTarget) : null,
      status: item.status,
      changeType: item.changeType || 'value_update',
      changeTypeLabel: CHANGE_TYPE_LABELS[item.changeType] || item.changeType || 'Update',
      isBaseline: item.changeType === 'initial' || isBaseline,
      changedByName: item.changedByName || item.changedBy?.name || 'System',
      note: item.note || '',
    };
  });
}
