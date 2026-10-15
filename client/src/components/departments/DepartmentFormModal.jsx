// Reusable Department form modal.
// Used by the Departments page for create and edit flows.
// Owns form state, client-side validation, and unsaved-changes guard.

import { useEffect, useState } from 'react';
import Modal from '../common/Modal.jsx';

export const EMPTY_DEPARTMENT_FORM = {
  name: '',
  code: '',
  head: '',
  description: '',
  status: 'active',
};

const isDirty = (a, b) => {
  if (!a || !b) return false;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if ((a[key] ?? '') !== (b[key] ?? '')) return true;
  }
  return false;
};

export default function DepartmentFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialValues = EMPTY_DEPARTMENT_FORM,
  mode = 'create',
  submitting = false,
}) {
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
    } else if (values.name.trim().length > 80) {
      next.name = 'Name must be at most 80 characters';
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

  const handleBeforeClose = () => {
    if (isDirty(initialValues, values)) {
      return window.confirm('You have unsaved changes. Discard them?');
    }
    return true;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={submitting ? undefined : onClose}
      onBeforeClose={submitting ? undefined : handleBeforeClose}
      title={mode === 'edit' ? 'Edit Department' : 'Add Department'}
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              if (handleBeforeClose()) onClose();
            }}
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
            {submitting ? 'Saving…' : mode === 'edit' ? 'Save Changes' : 'Create Department'}
          </button>
        </div>
      }
    >
      <form id="department-form" onSubmit={handleSubmit} className="space-y-4">
        <Field
          id="dept-name"
          label="Name"
          required
          value={values.name}
          onChange={(v) => setField('name', v)}
          error={errors.name}
          placeholder="e.g. Sales"
          maxLength={80}
        />
        <Field
          id="dept-code"
          label="Code"
          required
          value={values.code}
          onChange={(v) => setField('code', v.toUpperCase())}
          error={errors.code}
          placeholder="e.g. SAL"
          maxLength={10}
        />
        <Field
          id="dept-head"
          label="Head of Department"
          value={values.head}
          onChange={(v) => setField('head', v)}
          placeholder="e.g. Alice Chen"
          maxLength={120}
        />
        <Field
          id="dept-description"
          label="Description"
          value={values.description}
          onChange={(v) => setField('description', v)}
          placeholder="Optional short description"
          textarea
          maxLength={500}
        />
        <div>
          <label htmlFor="dept-status" className="block text-sm font-medium text-slate-700 mb-1">Status</label>
          <select
            id="dept-status"
            value={values.status}
            onChange={(e) => setField('status', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white
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

function Field({ id, label, required, value, onChange, error, placeholder, textarea, maxLength, type = 'text' }) {
  const inputId = id || `dept-${label.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
  const inputClasses = `w-full px-3 py-2 border rounded-md text-sm
    focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent
    ${error ? 'border-red-300' : 'border-slate-300'}`;

  return (
    <div>
      <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {textarea ? (
        <textarea
          id={inputId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          maxLength={maxLength}
          className={inputClasses}
        />
      ) : (
        <input
          id={inputId}
          type={type}
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
