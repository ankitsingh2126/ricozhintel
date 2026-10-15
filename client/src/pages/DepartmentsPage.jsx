// Departments page with full CRUD:
// - List with loading/error/empty states
// - Search by name or code (server-side filter)
// - Pagination (6 per page)
// - Add / Edit via the shared DepartmentFormModal
// - Delete with confirm dialog
// - Toasts on success and failure

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, User, Plus, Pencil, Trash2, Search, X } from 'lucide-react';
import PageHeader from '../components/common/PageHeader.jsx';
import Loader from '../components/common/Loader.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import Pagination from '../components/common/Pagination.jsx';
import DepartmentFormModal, {
  EMPTY_DEPARTMENT_FORM,
} from '../components/departments/DepartmentFormModal.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { apiClient } from '../services/apiClient.js';
import { fetchDepartments } from '../services/departmentService.js';

const PAGE_SIZE = 6;

const formatError = (err) => {
  if (!err) return 'Something went wrong';
  if (err.details && Array.isArray(err.details) && err.details.length > 0) {
    return err.details.map((d) => `${d.field}: ${d.message}`).join(' · ');
  }
  return err.message || 'Something went wrong';
};

export default function DepartmentsPage() {
  const { showSuccess, showError } = useToast();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Reset to page 1 whenever the search term changes.
  useEffect(() => {
    setPage(1);
  }, [search]);

  const fetcher = useCallback(
    () =>
      fetchDepartments({
        search: search || undefined,
        page,
        limit: PAGE_SIZE,
      }),
    [search, page]
  );
  const { data, loading, error, refetch } = useFetch(fetcher, [search, page]);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (dept) => {
    setEditing(dept);
    setFormOpen(true);
  };

  const closeForm = () => {
    if (submitting) return;
    setFormOpen(false);
    setEditing(null);
  };

  const openConfirmDelete = (dept) => {
    setDeleteTarget(dept);
    setConfirmOpen(true);
  };

  const closeConfirmDelete = () => {
    if (submitting) return;
    setConfirmOpen(false);
    setDeleteTarget(null);
  };

  const handleSubmit = async (formValues) => {
    setSubmitting(true);
    try {
      const payload = {
        name: formValues.name.trim(),
        code: formValues.code.trim().toUpperCase(),
        head: formValues.head.trim(),
        description: formValues.description.trim(),
        status: formValues.status,
      };

      if (editing) {
        await apiClient.patch(`/departments/${editing._id}`, payload);
        showSuccess(`Department "${payload.name}" updated`);
      } else {
        await apiClient.post('/departments', payload);
        showSuccess(`Department "${payload.name}" created`);
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
      await apiClient.delete(`/departments/${deleteTarget._id}`);
      showSuccess(`Department "${deleteTarget.name}" deleted`);
      setConfirmOpen(false);
      setDeleteTarget(null);

      // If we just deleted the last item on this page, step back one page.
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

  const hasSearch = search.trim().length > 0;

  return (
    <div>
      <PageHeader
        title="Departments"
        description="All departments across the organization."
        action={
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-brand-600
                       text-white text-sm font-medium hover:bg-brand-700"
          >
            <Plus size={16} />
            Add Department
          </button>
        }
      />

      <div className="relative mb-4 max-w-md">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="text"
          placeholder="Search by name or code…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-9 py-2 border border-slate-200 rounded-md text-sm
                     bg-white focus:outline-none focus:ring-2 focus:ring-brand-500
                     focus:border-transparent"
        />
        {hasSearch && (
          <button
            type="button"
            onClick={() => setSearch('')}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400
                       hover:text-slate-700"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {loading && <Loader label="Loading departments…" />}
      {!loading && error && <ErrorState message={error.message} onRetry={refetch} />}

      {!loading && !error && data && data.items.length === 0 && (
        <EmptyState
          title={hasSearch ? 'No matching departments' : 'No departments yet'}
          description={
            hasSearch
              ? `No department matches “${search}”. Try a different term.`
              : 'Click “Add Department” above to create the first one.'
          }
        />
      )}

      {!loading && !error && data && data.items.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.items.map((dept) => (
              <div
                key={dept._id}
                className="bg-white border border-slate-200 rounded-lg p-4 hover:border-brand-400 hover:shadow-sm transition"
              >
                <div className="flex items-start justify-between">
                  <Link to={`/departments/${dept._id}`} className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-md bg-brand-50 text-brand-600 flex items-center justify-center">
                      <Building2 size={20} />
                    </div>
                    <div>
                      <div className="font-medium text-slate-900">{dept.name}</div>
                      <div className="text-xs text-slate-500">{dept.code}</div>
                    </div>
                  </Link>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border
                      ${dept.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'}`}
                  >
                    {dept.status}
                  </span>
                </div>

                {dept.head && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                    <User size={14} />
                    <span>{dept.head}</span>
                  </div>
                )}
                {dept.description && (
                  <p className="mt-2 text-sm text-slate-500 line-clamp-2">{dept.description}</p>
                )}

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(dept)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium
                               text-slate-600 hover:text-brand-600 hover:bg-brand-50 rounded-md"
                  >
                    <Pencil size={13} />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => openConfirmDelete(dept)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium
                               text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-md"
                  >
                    <Trash2 size={13} />
                    Delete
                  </button>
                </div>
              </div>
            ))}
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

      <DepartmentFormModal
        isOpen={formOpen}
        onClose={closeForm}
        onSubmit={handleSubmit}
        initialValues={
          editing
            ? {
                name: editing.name || '',
                code: editing.code || '',
                head: editing.head || '',
                description: editing.description || '',
                status: editing.status || 'active',
              }
            : EMPTY_DEPARTMENT_FORM
        }
        mode={editing ? 'edit' : 'create'}
        submitting={submitting}
      />

      <ConfirmDialog
        isOpen={confirmOpen}
        onCancel={closeConfirmDelete}
        onConfirm={handleDelete}
        title="Delete department?"
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