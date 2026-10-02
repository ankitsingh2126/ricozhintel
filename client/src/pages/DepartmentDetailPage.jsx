// Department detail: department info + its KPIs.

import { useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PageHeader from '../components/common/PageHeader.jsx';
import Loader from '../components/common/Loader.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import StatusBadge from '../components/common/StatusBadge.jsx';
import ProgressBar from '../components/common/ProgressBar.jsx';
import { fetchDepartmentById } from '../services/departmentService.js';
import { fetchKpis } from '../services/kpiService.js';
import { useFetch } from '../hooks/useFetch.js';
import { formatNumber } from '../utils/formatters.js';

export default function DepartmentDetailPage() {
  const { id } = useParams();

  const deptFetcher = useCallback(() => fetchDepartmentById(id), [id]);
  const kpisFetcher = useCallback(() => fetchKpis({ department: id, limit: 100 }), [id]);

  const dept = useFetch(deptFetcher, [id]);
  const kpis = useFetch(kpisFetcher, [id]);

  const loading = dept.loading || kpis.loading;
  const error = dept.error || kpis.error;

  const refetchAll = () => {
    dept.refetch();
    kpis.refetch();
  };

  return (
    <div>
      <Link to="/departments" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-3">
        <ArrowLeft size={14} /> Back to Departments
      </Link>

      {loading && <Loader label="Loading department…" />}
      {!loading && error && <ErrorState message={error.message} onRetry={refetchAll} />}

      {!loading && !error && dept.data && (
        <div className="space-y-6">
          <PageHeader
            title={dept.data.name}
            description={dept.data.description || `Code: ${dept.data.code}`}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="text-xs text-slate-500">Code</div>
              <div className="mt-1 font-medium">{dept.data.code}</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="text-xs text-slate-500">Head</div>
              <div className="mt-1 font-medium">{dept.data.head || '—'}</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="text-xs text-slate-500">Status</div>
              <div className="mt-1 font-medium capitalize">{dept.data.status}</div>
            </div>
          </div>

          <div>
            <h3 className="font-medium text-slate-900 mb-3">KPIs in this department</h3>

            {kpis.data && kpis.data.items.length === 0 && (
              <EmptyState title="No KPIs yet" description="This department has no KPIs assigned." />
            )}

            {kpis.data && kpis.data.items.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">Name</th>
                      <th className="text-left px-4 py-3 font-medium">Code</th>
                      <th className="text-left px-4 py-3 font-medium">Target</th>
                      <th className="text-left px-4 py-3 font-medium">Current</th>
                      <th className="text-left px-4 py-3 font-medium w-40">Progress</th>
                      <th className="text-left px-4 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {kpis.data.items.map((kpi) => {
                      const progress = kpi.target > 0
                        ? Math.min(150, Math.round((kpi.currentValue / kpi.target) * 100))
                        : 0;
                      return (
                        <tr key={kpi._id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <Link to={`/kpis/${kpi._id}`} className="text-brand-600 hover:underline">
                              {kpi.name}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-slate-500">{kpi.code}</td>
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
            )}
          </div>
        </div>
      )}
    </div>
  );
}
