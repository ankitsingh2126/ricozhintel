// KPIs list page with status filter + search.

import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import PageHeader from '../components/common/PageHeader.jsx';
import Loader from '../components/common/Loader.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import StatusBadge from '../components/common/StatusBadge.jsx';
import ProgressBar from '../components/common/ProgressBar.jsx';
import { fetchKpis } from '../services/kpiService.js';
import { useFetch } from '../hooks/useFetch.js';
import { formatNumber } from '../utils/formatters.js';

const STATUS_OPTIONS = [
  { value: '',          label: 'All statuses' },
  { value: 'on_track',  label: 'On Track' },
  { value: 'at_risk',   label: 'At Risk' },
  { value: 'off_track', label: 'Off Track' },
  { value: 'completed', label: 'Completed' },
];

export default function KpisPage() {
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  const fetcher = useCallback(
    () => fetchKpis({ status: status || undefined, search: search || undefined, limit: 100 }),
    [status, search]
  );
  const { data, loading, error, refetch } = useFetch(fetcher, [status, search]);

  return (
    <div>
      <PageHeader
        title="KPIs"
        description="Key performance indicators across all departments."
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-md text-sm
                       focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-md text-sm bg-white
                     focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {loading && <Loader label="Loading KPIs…" />}

      {!loading && error && <ErrorState message={error.message} onRetry={refetch} />}

      {!loading && !error && data && data.items.length === 0 && (
        <EmptyState
          title="No KPIs found"
          description="Try a different filter, or run the server's seed script."
        />
      )}

      {!loading && !error && data && data.items.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Name</th>
                  <th className="text-left px-4 py-3 font-medium">Department</th>
                  <th className="text-left px-4 py-3 font-medium">Target</th>
                  <th className="text-left px-4 py-3 font-medium">Current</th>
                  <th className="text-left px-4 py-3 font-medium w-40">Progress</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((kpi) => {
                  const progress = kpi.target > 0
                    ? Math.min(150, Math.round((kpi.currentValue / kpi.target) * 100))
                    : 0;
                  return (
                    <tr key={kpi._id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Link to={`/kpis/${kpi._id}`} className="text-brand-600 hover:underline font-medium">
                          {kpi.name}
                        </Link>
                        <div className="text-xs text-slate-400">{kpi.code}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {kpi.department?.name || '—'}
                      </td>
                      <td className="px-4 py-3">{formatNumber(kpi.target)} {kpi.unit}</td>
                      <td className="px-4 py-3">{formatNumber(kpi.currentValue)} {kpi.unit}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1"><ProgressBar value={progress} status={kpi.status} /></div>
                          <span className="text-xs text-slate-500 w-10 text-right">{progress}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={kpi.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
