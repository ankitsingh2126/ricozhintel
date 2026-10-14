// Departments page with full CRUD:
// - List with loading/error/empty states
// - Add / Edit via a shared modal form
// - Delete with confirm dialog
// - Toasts on success and failure

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, User, Plus, Pencil, Trash2 } from 'lucide-react';
import PageHeader from '../components/common/PageHeader.jsx';
import Loader from '../components/common/Loader.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import Modal from '../components/common/Modal.jsx';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { apiClient } from '../services/apiClient.js';
import { fetchDepartments } from '../services/departmentService.js';

const EMPTY_FORM = {
  name: '',
  code: '',
  head: '',
  description: '',
  status: 'active',
};

// Convert client error object → readable string.
const formatError = (err) => {
  if (!err) return 'Something went wrong';
  if (err.details && Array.isArray(err.details) && err.details.length > 0) {
    return err.details.map((d) => `${d.field}: ${d.message}`).join(' · ');
  }
  return err.message || 'Something went wrong';
};

export default function DepartmentsPage() {
  const { showSuccess, showError } = useToast();

  const fetcher = useCallback(() => fetchDepartments({ limit: 100 }), []);
  const { data, loading, error, refetch } = useFetch(fetcher, []);

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
      refetch();
    } catch (err) {
      showError(formatError(err));
    } finally {
      setSubmitting(false);
    }
  };

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

      {loading && <Loader label="Loading departments…" />}

      {!loading && error && <ErrorState message={error.message} onRetry={refetch} />}

      {!loading && !error && data && data.items.length === 0 && (
        <EmptyState
          title="No departments yet"
          description='Click "Add Department" above to create the first one.'
        />
      )}

      {!loading && !error && data && data.items.length > 0 && (
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
      )}

      <DepartmentFormModal
        isOpen={formOpen}
        onClose={closeForm}
        onSubmit={handleSubmit}
        initialValues={editing ? {
          name: editing.name || '',
          code: editing.code || '',
          head: editing.head || '',
          description: editing.description || '',
          status: editing.status || 'active',
        } : EMPTY_FORM}
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

// ---- form inside the modal ---------------------------------------------

function DepartmentFormModal({ isOpen, onClose, onSubmit, initialValues, mode, submitting }) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      setValues(initialValues);
      setErrors({});
    }
  }, [isOpen, initialValues]);

  const setField = (field, value) => {
    setValues((v) => ({ ...v, [field]: value }));
    if (errors[field]) {
      setErrors((e) => ({ ...e, [field]: undefined }));
    }
  };

  const validate = () => {
    const next = {};
    if (!values.name.trim() || values.name.trim().length < 2) {
      next.name = 'Name must be at least 2 characters';
    }
    const code = values.code.trim();
    if (!code || code.length < 2 || code.length > 10) {
      next.code = 'Code must be 2-10 characters';
    } else if (!/^[A-Za-z0-9_-]+$/.test(code)) {
      next.code = 'Code may only contain letters, numbers, hyphens, underscores';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(values);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={submitting ? undefined : onClose}
      title={mode === 'edit' ? 'Edit Department' : 'Add Department'}
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-md border border-slate-300 text-sm font-medium
                       text-slate-700 bg-white hover:bg-slate-50
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="department-form"
            disabled={submitting}
            className="px-4 py-2 rounded-md bg-brand-600 text-white text-sm font-medium
                       hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Saving…' : mode === 'edit' ? 'Save Changes' : 'Create'}
          </button>
        </div>
      }
    >
      <form id="department-form" onSubmit={handleSubmit} className="space-y-4">
        <Field
          label="Name"
          required
          value={values.name}
          onChange={(v) => setField('name', v)}
          error={errors.name}
          placeholder="e.g. Sales"
        />
        <Field
          label="Code"
          required
          value={values.code}
          onChange={(v) => setField('code', v.toUpperCase())}
          error={errors.code}
          placeholder="e.g. SAL"
          maxLength={10}
        />
        <Field
          label="Head"
          value={values.head}
          onChange={(v) => setField('head', v)}
          placeholder="e.g. Alice Chen"
        />
        <Field
          label="Description"
          value={values.description}
          onChange={(v) => setField('description', v)}
          placeholder="Optional short description"
          textarea
        />
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
          <select
            value={values.status}
            onChange={(e) => setField('status', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm
                       focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </form>
    </Modal>
  );
}

function Field({ label, required, value, onChange, error, placeholder, textarea, maxLength }) {
  const inputClasses = `w-full px-3 py-2 border rounded-md text-sm
    focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent
    ${error ? 'border-red-300' : 'border-slate-300'}`;

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className={inputClasses}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          className={inputClasses}
        />
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}