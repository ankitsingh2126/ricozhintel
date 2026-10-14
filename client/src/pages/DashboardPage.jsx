// Executive dashboard.
// Summary cards + two charts + department snapshot table.
// All data comes from the live backend.

import { useCallback } from 'react';
import PageHeader from '../components/common/PageHeader.jsx';
import Loader from '../components/common/Loader.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import KpiCard from '../components/dashboard/KpiCard.jsx';
import StatusBreakdownChart from '../components/charts/StatusBreakdownChart.jsx';
import DepartmentProgressChart from '../components/charts/DepartmentProgressChart.jsx';
import ProgressBar from '../components/common/ProgressBar.jsx';
import {
  fetchKpiSummary,
  fetchKpiSummaryByDepartment,
  fetchKpis,
} from '../services/kpiService.js';
import { useFetch } from '../hooks/useFetch.js';
import { formatNumber, formatPercent } from '../utils/formatters.js';

export default function DashboardPage() {
  const summaryFetcher = useCallback(() => fetchKpiSummary(), []);
  const kpisFetcher = useCallback(() => fetchKpis({ limit: 100 }), []);
  const deptSummaryFetcher = useCallback(() => fetchKpiSummaryByDepartment(), []);

  const summary = useFetch(summaryFetcher, []);
  const kpis = useFetch(kpisFetcher, []);
  const deptSummary = useFetch(deptSummaryFetcher, []);

  const loading = summary.loading || kpis.loading || deptSummary.loading;
  const error = summary.error || kpis.error || deptSummary.error;

  const refetchAll = () => {
    summary.refetch();
    kpis.refetch();
    deptSummary.refetch();
  };

  return (
    <div>
      <PageHeader
        title="Executive Dashboard"
        description="Unified view of cross-functional business performance."
      />

      {loading && <Loader label="Loading dashboard…" />}

      {!loading && error && (
        <ErrorState message={error.message} onRetry={refetchAll} />
      )}

      {!loading && !error && summary.data && kpis.data && deptSummary.data && (
        <div className="space-y-6">
          {/* KPI Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Total KPIs"
              value={formatNumber(summary.data.total)}
              tone="info"
              hint="Across all departments"
            />
            <KpiCard
              label="On Track"
              value={formatNumber(summary.data.byStatus.on_track)}
              tone="success"
              hint="Meeting target pace"
            />
            <KpiCard
              label="At Risk"
              value={formatNumber(summary.data.byStatus.at_risk)}
              tone="warning"
              hint="Needs attention"
            />
            <KpiCard
              label="Off Track"
              value={formatNumber(summary.data.byStatus.off_track)}
              tone="danger"
              hint="Below target pace"
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <StatusBreakdownChart byStatus={summary.data.byStatus} />
            <DepartmentProgressChart kpis={kpis.data.items} />
          </div>

          {/* Average achievement summary line */}
          <div className="text-sm text-slate-500">
            Average progress across all KPIs:&nbsp;
            <span className="font-medium text-slate-700">
              {formatPercent(summary.data.avgProgress)}
            </span>
          </div>

          {/* Department snapshot table */}
          <div>
            <h3 className="font-medium text-slate-900 mb-3">Department Snapshot</h3>

            {deptSummary.data.length === 0 && (
              <EmptyState
                title="No department data yet"
                description="Add KPIs to your departments to see the snapshot here."
              />
            )}

            {deptSummary.data.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[720px]">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium">Department</th>
                        <th className="text-left px-4 py-3 font-medium">Total</th>
                        <th className="text-left px-4 py-3 font-medium">On Track</th>
                        <th className="text-left px-4 py-3 font-medium">At Risk</th>
                        <th className="text-left px-4 py-3 font-medium">Off Track</th>
                        <th className="text-left px-4 py-3 font-medium">Completed</th>
                        <th className="text-left px-4 py-3 font-medium w-48">Avg Achievement</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {deptSummary.data.map((row) => {
                        const ach = row.avgAchievement;
                        const capped = ach !== null && ach !== undefined
                          ? Math.min(150, ach)
                          : 0;
                        // Pick a bar color based on average achievement
                        const barStatus =
                          ach === null || ach === undefined
                            ? 'on_track'
                            : ach >= 90
                              ? 'on_track'
                              : ach >= 70
                                ? 'at_risk'
                                : 'off_track';

                        return (
                          <tr key={row.department._id} className="hover:bg-slate-50">
                            <td className="px-4 py-3">
                              <div className="font-medium text-slate-900">
                                {row.department.name}
                              </div>
                              <div className="text-xs text-slate-400">
                                {row.department.code}
                              </div>
                            </td>
                            <td className="px-4 py-3 font-medium">{row.total}</td>
                            <td className="px-4 py-3 text-emerald-700">
                              {row.byStatus.on_track}
                            </td>
                            <td className="px-4 py-3 text-amber-700">
                              {row.byStatus.at_risk}
                            </td>
                            <td className="px-4 py-3 text-red-700">
                              {row.byStatus.off_track}
                            </td>
                            <td className="px-4 py-3 text-indigo-700">
                              {row.byStatus.completed}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="flex-1">
                                  <ProgressBar value={capped} status={barStatus} />
                                </div>
                                <span className="text-xs text-slate-500 w-12 text-right">
                                  {ach != null ? `${ach}%` : '—'}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}