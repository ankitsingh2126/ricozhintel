// Executive dashboard.
// Shows summary cards + two charts, all fed by the live backend.

import { useCallback } from 'react';
import PageHeader from '../components/common/PageHeader.jsx';
import Loader from '../components/common/Loader.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import KpiCard from '../components/dashboard/KpiCard.jsx';
import StatusBreakdownChart from '../components/charts/StatusBreakdownChart.jsx';
import DepartmentProgressChart from '../components/charts/DepartmentProgressChart.jsx';
import { fetchKpiSummary, fetchKpis } from '../services/kpiService.js';
import { useFetch } from '../hooks/useFetch.js';
import { formatNumber, formatPercent } from '../utils/formatters.js';

export default function DashboardPage() {
  const summaryFetcher = useCallback(() => fetchKpiSummary(), []);
  const kpisFetcher = useCallback(() => fetchKpis({ limit: 100 }), []);

  const summary = useFetch(summaryFetcher, []);
  const kpis = useFetch(kpisFetcher, []);

  const loading = summary.loading || kpis.loading;
  const error = summary.error || kpis.error;

  const refetchAll = () => {
    summary.refetch();
    kpis.refetch();
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

      {!loading && !error && summary.data && kpis.data && (
        <div className="space-y-6">
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <StatusBreakdownChart byStatus={summary.data.byStatus} />
            <DepartmentProgressChart kpis={kpis.data.items} />
          </div>

          <div className="text-sm text-slate-500">
            Average progress across all KPIs:&nbsp;
            <span className="font-medium text-slate-700">
              {formatPercent(summary.data.avgProgress)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
