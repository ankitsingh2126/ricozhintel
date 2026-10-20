// KPIs page with full CRUD:
// - List with filters (status, period, search)
// - Pagination (10 per page)
// - Add / Edit via the shared KpiFormModal
// - Delete with confirm dialog
// - Toasts on success and failure

import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Pencil, Trash2, Gauge, Download } from 'lucide-react';
import PageHeader from '../components/common/PageHeader.jsx';
import Loader from '../components/common/Loader.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import Pagination from '../components/common/Pagination.jsx';
import StatusBadge from '../components/common/StatusBadge.jsx';
import ProgressBar from '../components/common/ProgressBar.jsx';
import KpiFormModal from '../components/kpis/KpiFormModal.jsx';
import { EMPTY_KPI_FORM } from '../constants/formConstants.js';
import QuickValueModal from '../components/kpis/QuickValueModal.jsx';
import { useToast } from '../context/useToast.js';
import { useAuth } from '../context/useAuth.js';
import { useFetch } from '../hooks/useFetch.js';
import { apiClient } from '../services/apiClient.js';
import { fetchKpis } from '../services/kpiService.js';
import { fetchDepartments } from '../services/departmentService.js';
import { formatNumber, STATUS_LABELS } from '../utils/formatters.js';
import { generateCsv, downloadCsv, getExportFilename } from '../utils/csvExport.js';

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { value: '',          label: 'All statuses' },
  { value: 'on_track',  label: 'On Track' },
  { value: 'at_risk',   label: 'At Risk' },
  { value: 'off_track', label: 'Off Track' },
  { value: 'completed', label: 'Completed' },
];

const PERIOD_OPTIONS = [
  { value: '',          label: 'All periods' },
  { value: 'monthly',   label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly',    label: 'Yearly' },
];

const formatError = (err) => {
  if (!err) return 'Something went wrong';
  if (err.details && Array.isArray(err.details) && err.details.length > 0) {
    return err.details.map((d) => `${d.field}: ${d.message}`).join(' · ');
  }
  return err.message || 'Something went wrong';
};

export default function KpisPage() {
  const { showSuccess, showError } = useToast();
  const { isAdmin } = useAuth();

  const [status, setStatus] = useState('');
  const [period, setPeriod] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const handleSearchChange = (val) => {
    setSearch(val);
    setPage(1);
  };

  const handleStatusChange = (val) => {
    setStatus(val);
    setPage(1);
  };

  const handlePeriodChange = (val) => {
    setPeriod(val);
    setPage(1);
  };

  const fetcher = useCallback(
    () =>
      fetchKpis({
        status: status || undefined,
        period: period || undefined,
        search: search || undefined,
        page,
        limit: PAGE_SIZE,
      }),
    [status, period, search, page]
  );
  const { data, loading, error, refetch } = useFetch(fetcher, [status, period, search, page]);

  const deptFetcher = useCallback(() => fetchDepartments({ limit: 100 }), []);
  const departments = useFetch(deptFetcher, []);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [quickValueTarget, setQuickValueTarget] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (kpi) => {
    setEditing(kpi);
    setFormOpen(true);
  };

  const openQuickValue = (kpi) => {
    setQuickValueTarget(kpi);
  };

  const closeQuickValue = () => {
    if (submitting) return;
    setQuickValueTarget(null);
  };

  const closeForm = () => {
    if (submitting) return;
    setFormOpen(false);
    setEditing(null);
  };

  const openConfirmDelete = (kpi) => {
    setDeleteTarget(kpi);
    setConfirmOpen(true);
  };

  const closeConfirmDelete = () => {
    if (submitting) return;
    setConfirmOpen(false);
    setDeleteTarget(null);
  };

  const [exporting, setExporting] = useState(false);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      // Fetch all KPIs matching the current filters (up to 1000)
      const res = await fetchKpis({
        status: status || undefined,
        period: period || undefined,
        search: search || undefined,
        page: 1,
        limit: 1000,
      });

      const items = res.items || [];
      if (items.length === 0) {
        showError('No KPIs to export for the selected filters.');
        return;
      }

      const columns = [
        { label: 'KPI Name', key: 'name' },
        { label: 'Code', key: 'code' },
        { label: 'Department Name', key: (r) => r.department?.name || '—' },
        { label: 'Department Code', key: (r) => r.department?.code || '—' },
        { label: 'Target', key: 'target' },
        { label: 'Current Value', key: 'currentValue' },
        { label: 'Unit', key: 'unit' },
        { label: 'Achievement (%)', key: (r) => r.achievement != null ? `${r.achievement}%` : '—' },
        { label: 'Status', key: (r) => STATUS_LABELS[r.status] || r.status },
        { label: 'Period', key: 'period' },
        { label: 'Owner', key: (r) => r.owner || '—' },
        { label: 'Status Rule', key: (r) => r.statusRule ? r.statusRule.replace(/_/g, ' ') : '—' },
      ];

      const csvContent = generateCsv(columns, items);
      const filename = getExportFilename('kpis');
      downloadCsv(csvContent, filename);
      showSuccess(`Exported ${items.length} KPI(s) to ${filename}`);
    } catch (err) {
      showError(formatError(err));
    } finally {
      setExporting(false);
    }
  };

  const handleQuickValueUpdate = async ({ currentValue, status, note }) => {
    if (!quickValueTarget) return;
    setSubmitting(true);
    try {
      await apiClient.patch(`/kpis/${quickValueTarget._id}`, { currentValue, status, note });
      showSuccess(`KPI "${quickValueTarget.name}" value updated`);
      setQuickValueTarget(null);
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

      if (editing) {
        await apiClient.patch(`/kpis/${editing._id}`, payload);
        showSuccess(`KPI "${payload.name}" updated`);
      } else {
        await apiClient.post('/kpis', payload);
        showSuccess(`KPI "${payload.name}" created`);
      }

      setFormOpen(false);
      setEditing(null);
      refetch();
    } catch (err) {
      showError(formatError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      await apiClient.delete(`/kpis/${deleteTarget._id}`);
      showSuccess(`KPI "${deleteTarget.name}" deleted`);
      setConfirmOpen(false);
      setDeleteTarget(null);

      if (data && data.items.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        refetch();
      }
    } catch (err) {
      showError(formatError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="KPIs"
        description="Key performance indicators across all departments."
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-slate-300
                         bg-white text-slate-700 text-sm font-medium hover:bg-slate-50
                         disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Download size={15} />
              {exporting ? 'Exporting…' : 'Export CSV'}
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-brand-600
                           text-white text-sm font-medium hover:bg-brand-700 cursor-pointer"
              >
                <Plus size={16} />
                Add KPI
              </button>
            )}
          </div>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or code…"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-md text-sm
                       focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>
        <select
          value={status}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-md text-sm bg-white
                     focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={period}
          onChange={(e) => handlePeriodChange(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-md text-sm bg-white
                     focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        >
          {PERIOD_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {loading && <Loader label="Loading KPIs…" />}
      {!loading && error && <ErrorState message={error.message} onRetry={refetch} />}

      {!loading && !error && data && data.items.length === 0 && (
        <EmptyState
          title="No KPIs found"
          description="Try a different filter, or create a new KPI."
        />
      )}

      {!loading && !error && data && data.items.length > 0 && (
        <>
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Name</th>
                    <th className="text-left px-4 py-3 font-medium">Department</th>
                    <th className="text-left px-4 py-3 font-medium">Period</th>
                    <th className="text-left px-4 py-3 font-medium">Target</th>
                    <th className="text-left px-4 py-3 font-medium">Current</th>
                    <th className="text-left px-4 py-3 font-medium w-40">Progress</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    {isAdmin && <th className="text-right px-4 py-3 font-medium">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.items.map((kpi) => {
                    const progress =
                      kpi.achievement !== null && kpi.achievement !== undefined
                        ? Math.min(150, kpi.achievement)
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
                        <td className="px-4 py-3 text-slate-600 capitalize">{kpi.period}</td>
                        <td className="px-4 py-3">{formatNumber(kpi.target)} {kpi.unit}</td>
                        <td className="px-4 py-3">{formatNumber(kpi.currentValue)} {kpi.unit}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <ProgressBar value={progress} status={kpi.status} />
                            </div>
                            <span className="text-xs text-slate-500 w-10 text-right">
                              {kpi.achievement != null ? `${kpi.achievement}%` : '—'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={kpi.status} /></td>
                        {isAdmin && (
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => openQuickValue(kpi)}
                                title="Update Current Value"
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium
                                           text-brand-700 hover:text-brand-800 bg-brand-50 hover:bg-brand-100 rounded-md cursor-pointer"
                              >
                                <Gauge size={12} />
                                Value
                              </button>
                              <button
                                type="button"
                                onClick={() => openEdit(kpi)}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium
                                           text-slate-600 hover:text-brand-600 hover:bg-brand-50 rounded-md cursor-pointer"
                              >
                                <Pencil size={12} />
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => openConfirmDelete(kpi)}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium
                                           text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-md cursor-pointer"
                              >
                                <Trash2 size={12} />
                                Delete
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <Pagination
            page={data.meta.page}
            pages={data.meta.pages}
            total={data.meta.total}
            limit={data.meta.limit}
            onChange={setPage}
          />
        </>
      )}

      <KpiFormModal
        isOpen={formOpen}
        onClose={closeForm}
        onSubmit={handleSubmit}
        initialValues={
          editing
            ? {
                name: editing.name || '',
                code: editing.code || '',
                department: editing.department?._id || editing.department || '',
                unit: editing.unit || '%',
                target: String(editing.target ?? ''),
                currentValue: String(editing.currentValue ?? '0'),
                status: editing.status || 'on_track',
                period: editing.period || 'monthly',
                owner: editing.owner || '',
                statusRule: editing.statusRule || 'higher_is_better',
              }
            : EMPTY_KPI_FORM
        }
        mode={editing ? 'edit' : 'create'}
        submitting={submitting}
        departments={departments.data?.items || []}
      />

      <QuickValueModal
        isOpen={Boolean(quickValueTarget)}
        onClose={closeQuickValue}
        onSubmit={handleQuickValueUpdate}
        kpi={quickValueTarget}
        submitting={submitting}
      />

      <ConfirmDialog
        isOpen={confirmOpen}
        onCancel={closeConfirmDelete}
        onConfirm={handleDelete}
        title="Delete KPI?"
        message={
          deleteTarget
            ? `"${deleteTarget.name}" will be permanently deleted. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        danger
        busy={submitting}
      />
    </div>
  );
}