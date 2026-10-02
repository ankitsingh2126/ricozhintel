// KPI detail: full info + progress + status badge.

import { useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PageHeader from '../components/common/PageHeader.jsx';
import Loader from '../components/common/Loader.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import StatusBadge from '../components/common/StatusBadge.jsx';
import ProgressBar from '../components/common/ProgressBar.jsx';
import { apiClient } from '../services/apiClient.js';
import { useFetch } from '../hooks/useFetch.js';
import { formatNumber } from '../utils/formatters.js';

export default function KpiDetailPage() {
  const { id } = useParams();

  const fetcher = useCallback(async () => {
    const res = await apiClient.get(`/kpis/${id}`);
    return res.data.data;
  }, [id]);

  const { data, loading, error, refetch } = useFetch(fetcher, [id]);

  const progress = data && data.target > 0
    ? Math.min(150, Math.round((data.currentValue / data.target) * 100))
    : 0;

  return (
    <div>
      <Link to="/kpis" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-3">
        <ArrowLeft size={14} /> Back to KPIs
      </Link>

      {loading && <Loader label="Loading KPI…" />}
      {!loading && error && <ErrorState message={error.message} onRetry={refetch} />}

      {!loading && !error && data && (
        <div className="space-y-6">
          <PageHeader
            title={data.name}
            description={data.description || `Code: ${data.code}`}
            action={<StatusBadge status={data.status} />}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="text-xs text-slate-500">Department</div>
              <div className="mt-1 font-medium">
                {data.department?.name
                  ? <Link to={`/departments/${data.department._id}`} className="text-brand-600 hover:underline">{data.department.name}</Link>
                  : '—'}
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="text-xs text-slate-500">Period</div>
              <div className="mt-1 font-medium capitalize">{data.period}</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="text-xs text-slate-500">Unit</div>
              <div className="mt-1 font-medium">{data.unit}</div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <div className="flex items-end justify-between mb-2">
              <div>
                <div className="text-xs text-slate-500">Current</div>
                <div className="text-2xl font-semibold">{formatNumber(data.currentValue)} {data.unit}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500">Target</div>
                <div className="text-lg font-medium text-slate-700">{formatNumber(data.target)} {data.unit}</div>
              </div>
            </div>
            <ProgressBar value={progress} status={data.status} />
            <div className="mt-2 text-sm text-slate-500">
              {progress}% of target reached
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
