// KPI detail page.
// Shows the full record, progress bar, status badge, and links back to the
// owning department. Includes Edit and Delete actions wired to the same
// modal and confirm dialog used by the list page.

import { useCallback, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Trash2, Gauge } from 'lucide-react';
import PageHeader from '../components/common/PageHeader.jsx';
import Loader from '../components/common/Loader.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import StatusBadge from '../components/common/StatusBadge.jsx';
import ProgressBar from '../components/common/ProgressBar.jsx';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import KpiFormModal, { EMPTY_KPI_FORM } from '../components/kpis/KpiFormModal.jsx';
import QuickValueModal from '../components/kpis/QuickValueModal.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { apiClient } from '../services/apiClient.js';
import { fetchDepartments } from '../services/departmentService.js';
import { useFetch } from '../hooks/useFetch.js';
import { formatNumber } from '../utils/formatters.js';

const formatError = (err) => {
  if (!err) return 'Something went wrong';
  if (err.details && Array.isArray(err.details) && err.details.length > 0) {
    return err.details.map((d) => `${d.field}: ${d.message}`).join(' · ');
  }
  return err.message || 'Something went wrong';
};

export default function KpiDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  // ---- data: KPI itself ------------------------------------------------
  const kpiFetcher = useCallback(async () => {
    const res = await apiClient.get(`/kpis/${id}`);
    return res.data.data;
  }, [id]);

  const { data, loading, error, refetch } = useFetch(kpiFetcher, [id]);

  // ---- data: departments (for the edit form dropdown) ------------------
  const deptFetcher = useCallback(() => fetchDepartments({ limit: 100 }), []);
  const departments = useFetch(deptFetcher, []);

  // ---- modal + confirm state -------------------------------------------
  const [formOpen, setFormOpen] = useState(false);
  const [quickValueOpen, setQuickValueOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const openEdit = () => setFormOpen(true);

  const closeForm = () => {
    if (submitting) return;
    setFormOpen(false);
  };

  const openConfirmDelete = () => setConfirmOpen(true);

  const closeConfirmDelete = () => {
    if (submitting) return;
    setConfirmOpen(false);
  };

  // ---- actions ----------------------------------------------------------
  const handleQuickValueUpdate = async ({ currentValue, status }) => {
    setSubmitting(true);
    try {
      await apiClient.patch(`/kpis/${id}`, { currentValue, status });
      showSuccess(`KPI value updated to ${currentValue}`);
      setQuickValueOpen(false);
      refetch();
    } catch (err) {
      showError(formatError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (formValues) => {
    setSubmitting(true);
    try {
      const payload = {
        name: formValues.name.trim(),
        code: formValues.code.trim().toUpperCase(),
        department: formValues.department,
        unit: formValues.unit.trim() || '%',
        target: Number(formValues.target),
        currentValue: Number(formValues.currentValue) || 0,
        status: formValues.status,
        period: formValues.period,
        owner: formValues.owner.trim(),
        statusRule: formValues.statusRule,
      };

      await apiClient.patch(`/kpis/${id}`, payload);
      showSuccess(`KPI "${payload.name}" updated`);
      setFormOpen(false);
      refetch();
    } catch (err) {
      showError(formatError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      await apiClient.delete(`/kpis/${id}`);
      showSuccess(`KPI "${data?.name || ''}" deleted`);
      setConfirmOpen(false);
      navigate('/kpis');
    } catch (err) {
      showError(formatError(err));
      setSubmitting(false);
    }
  };

  // ---- derived values ---------------------------------------------------
  const progress =
    data && data.target > 0
      ? Math.min(150, Math.round((data.currentValue / data.target) * 100))
      : 0;

  const initialValues =
    data && departments.data
      ? {
          name: data.name || '',
          code: data.code || '',
          department: data.department?._id || data.department || '',
          unit: data.unit || '%',
          target: String(data.target ?? ''),
          currentValue: String(data.currentValue ?? '0'),
          status: data.status || 'on_track',
          period: data.period || 'monthly',
          owner: data.owner || '',
          statusRule: data.statusRule || 'higher_is_better',
        }
      : EMPTY_KPI_FORM;

  return (
    <div>
      <Link
        to="/kpis"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-3"
      >
        <ArrowLeft size={14} /> Back to KPIs
      </Link>

      {loading && <Loader label="Loading KPI…" />}
      {!loading && error && <ErrorState message={error.message} onRetry={refetch} />}

      {!loading && !error && data && (
        <div className="space-y-6">
          <PageHeader
            title={data.name}
            description={data.description || `Code: ${data.code}`}
            action={
              <div className="flex items-center gap-2">
                <StatusBadge status={data.status} />
                <button
                  type="button"
                  onClick={() => setQuickValueOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium
                             text-brand-700 bg-brand-50 border border-brand-200 rounded-md
                             hover:bg-brand-100"
                >
                  <Gauge size={14} /> Update Value
                </button>
                <button
                  type="button"
                  onClick={openEdit}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium
                             text-slate-700 bg-white border border-slate-300 rounded-md
                             hover:bg-slate-50"
                >
                  <Pencil size={14} /> Edit
                </button>
                <button
                  type="button"
                  onClick={openConfirmDelete}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium
                             text-red-700 bg-white border border-red-300 rounded-md
                             hover:bg-red-50"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            }
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="text-xs text-slate-500">Department</div>
              <div className="mt-1 font-medium">
                {data.department?.name ? (
                  <Link
                    to={`/departments/${data.department._id}`}
                    className="text-brand-600 hover:underline"
                  >
                    {data.department.name}
                  </Link>
                ) : (
                  '—'
                )}
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

          {data.owner && (
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="text-xs text-slate-500">Owner</div>
              <div className="mt-1 font-medium">{data.owner}</div>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <div className="flex items-end justify-between mb-2">
              <div>
                <div className="text-xs text-slate-500">Current</div>
                <div className="text-2xl font-semibold">
                  {formatNumber(data.currentValue)} {data.unit}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500">Target</div>
                <div className="text-lg font-medium text-slate-700">
                  {formatNumber(data.target)} {data.unit}
                </div>
              </div>
            </div>
            <ProgressBar value={progress} status={data.status} />
            <div className="mt-2 text-sm text-slate-500">
              {progress}% of target reached
            </div>
          </div>
        </div>
      )}

      <KpiFormModal
        isOpen={formOpen}
        onClose={closeForm}
        onSubmit={handleSubmit}
        initialValues={initialValues}
        mode="edit"
        submitting={submitting}
        departments={departments.data?.items || []}
      />

      <QuickValueModal
        isOpen={quickValueOpen}
        onClose={() => !submitting && setQuickValueOpen(false)}
        onSubmit={handleQuickValueUpdate}
        kpi={data}
        submitting={submitting}
      />

      <ConfirmDialog
        isOpen={confirmOpen}
        onCancel={closeConfirmDelete}
        onConfirm={handleDelete}
        title="Delete KPI?"
        message={
          data
            ? `"${data.name}" will be permanently deleted. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        danger
        busy={submitting}
      />
    </div>
  );
}