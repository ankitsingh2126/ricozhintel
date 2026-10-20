// Chronological KPI history timeline & change log table.
// Shows past value updates, initial creation, notes, statuses, and authors.

import { History } from 'lucide-react';
import StatusBadge from '../common/StatusBadge.jsx';
import Pagination from '../common/Pagination.jsx';
import Loader from '../common/Loader.jsx';
import ErrorState from '../common/ErrorState.jsx';
import { formatDate, formatNumber, CHANGE_TYPE_LABELS } from '../../utils/formatters.js';

export default function KpiHistoryTimeline({
  items = [],
  meta,
  loading = false,
  error = null,
  onRetry,
  onPageChange,
  unit = '',
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History size={18} className="text-slate-500" />
          <h3 className="font-semibold text-slate-900">Value History & Change Log</h3>
        </div>
        {meta?.total > 0 && (
          <span className="text-xs text-slate-500">
            {meta.total} {meta.total === 1 ? 'entry' : 'entries'} recorded
          </span>
        )}
      </div>

      {loading && <Loader label="Loading history…" />}
      {!loading && error && (
        <ErrorState message={error.message || 'Failed to load KPI history'} onRetry={onRetry} />
      )}

      {!loading && !error && items.length === 0 && (
        <div className="py-8 text-center text-slate-500 text-sm">
          <p>No historical updates recorded for this KPI yet.</p>
          <p className="text-xs text-slate-400 mt-1">
            Changes to current value will be logged automatically here.
          </p>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">Date & Time</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Previous</th>
                  <th className="py-3 px-3">New Value</th>
                  <th className="py-3 px-3">Target</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Changed By</th>
                  <th className="py-3 px-3">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 whitespace-nowrap text-slate-600 text-xs">
                      {formatDate(item.createdAt)}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-slate-100 text-slate-700">
                        {CHANGE_TYPE_LABELS[item.changeType] || item.changeType || 'Update'}
                      </span>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap text-slate-500">
                      {item.changeType === 'initial'
                        ? '—'
                        : `${formatNumber(item.previousValue)} ${unit}`}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap font-medium text-slate-900">
                      {formatNumber(item.newValue)} {unit}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap text-slate-500">
                      {formatNumber(item.target)} {unit}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap text-slate-600">
                      {item.changedByName || item.changedBy?.name || 'System'}
                    </td>
                    <td className="py-3 px-3 text-slate-600 max-w-xs truncate" title={item.note || ''}>
                      {item.note || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {meta && (
            <Pagination
              page={meta.page}
              pages={meta.pages}
              total={meta.total}
              limit={meta.limit}
              onChange={onPageChange}
            />
          )}
        </div>
      )}
    </div>
  );
}
