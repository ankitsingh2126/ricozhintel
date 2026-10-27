// User creation and editing modal dialog.
// Owns form state, field validation, and unsaved-changes protection.

import { useState } from 'react';
import Modal from '../common/Modal.jsx';
import { EMPTY_USER_FORM } from '../../constants/formConstants.js';

const isDirty = (a, b) => {
  if (!a || !b) return false;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if ((a[key] ?? '') !== (b[key] ?? '')) return true;
  }
  return false;
};

export default function UserFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialValues = EMPTY_USER_FORM,
  mode = 'create',
  submitting = false,
}) {
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  const [prevInitialValues, setPrevInitialValues] = useState(initialValues);
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});

  if (isOpen !== prevIsOpen || initialValues !== prevInitialValues) {
    setPrevIsOpen(isOpen);
    setPrevInitialValues(initialValues);
    if (isOpen) {
      setValues(initialValues);
      setErrors({});
    }
  }

  const setField = (field, value) => {
    setValues((v) => ({ ...v, [field]: value }));
    if (errors[field]) {
      setErrors((e) => ({ ...e, [field]: undefined }));
    }
  };

  const validate = () => {
    const next = {};
    const name = values.name ? values.name.trim() : '';
    if (!name || name.length < 2) {
      next.name = 'Name must be at least 2 characters';
    } else if (name.length > 100) {
      next.name = 'Name must be at most 100 characters';
    }

    const email = values.email ? values.email.trim() : '';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      next.email = 'Email address is required';
    } else if (!emailRegex.test(email)) {
      next.email = 'Please provide a valid email address';
    }

    if (mode === 'create') {
      const password = values.password || '';
      if (!password || password.length < 6) {
        next.password = 'Password must be at least 6 characters';
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    if (mode === 'create') {
      onSubmit({
        name: values.name.trim(),
        email: values.email.trim().toLowerCase(),
        password: values.password,
        role: values.role || 'viewer',
        status: values.status || 'active',
      });
    } else {
      onSubmit({
        name: values.name.trim(),
        email: values.email.trim().toLowerCase(),
      });
    }
  };

  const guardBeforeClose = () => {
    if (isDirty(values, initialValues)) {
      return window.confirm('You have unsaved changes. Discard them?');
    }
    return true;
  };

  const title = mode === 'create' ? 'Create New User' : 'Edit User Profile';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onBeforeClose={guardBeforeClose}
      title={title}
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
            form="user-form"
            disabled={submitting}
            className="px-4 py-2 rounded-md text-sm font-medium text-white
                       bg-brand-600 hover:bg-brand-700
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Saving…' : mode === 'create' ? 'Create User' : 'Save Changes'}
          </button>
        </div>
      }
    >
      <form id="user-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Full Name */}
        <div>
          <label htmlFor="user-name" className="block text-sm font-medium text-slate-700 mb-1">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            id="user-name"
            type="text"
            value={values.name || ''}
            onChange={(e) => setField('name', e.target.value)}
            disabled={submitting}
            placeholder="e.g. Jane Doe"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'user-name-error' : undefined}
            className={`w-full px-3 py-2 rounded-md border text-sm
              ${errors.name ? 'border-red-400 focus:ring-red-500' : 'border-slate-300 focus:ring-brand-500'}
              focus:outline-none focus:ring-1 disabled:bg-slate-50`}
          />
          {errors.name && (
            <p id="user-name-error" className="text-xs text-red-600 mt-1">
              {errors.name}
            </p>
          )}
        </div>

        {/* Email Address */}
        <div>
          <label htmlFor="user-email" className="block text-sm font-medium text-slate-700 mb-1">
            Email Address <span className="text-red-500">*</span>
          </label>
          <input
            id="user-email"
            type="email"
            value={values.email || ''}
            onChange={(e) => setField('email', e.target.value)}
            disabled={submitting}
            placeholder="e.g. jane.doe@company.internal"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'user-email-error' : undefined}
            className={`w-full px-3 py-2 rounded-md border text-sm
              ${errors.email ? 'border-red-400 focus:ring-red-500' : 'border-slate-300 focus:ring-brand-500'}
              focus:outline-none focus:ring-1 disabled:bg-slate-50`}
          />
          {errors.email && (
            <p id="user-email-error" className="text-xs text-red-600 mt-1">
              {errors.email}
            </p>
          )}
        </div>

        {/* Password (Create Mode Only) */}
        {mode === 'create' && (
          <div>
            <label htmlFor="user-password" className="block text-sm font-medium text-slate-700 mb-1">
              Initial Password <span className="text-red-500">*</span>
            </label>
            <input
              id="user-password"
              type="password"
              value={values.password || ''}
              onChange={(e) => setField('password', e.target.value)}
              disabled={submitting}
              placeholder="Minimum 6 characters"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'user-password-error' : undefined}
              className={`w-full px-3 py-2 rounded-md border text-sm
                ${errors.password ? 'border-red-400 focus:ring-red-500' : 'border-slate-300 focus:ring-brand-500'}
                focus:outline-none focus:ring-1 disabled:bg-slate-50`}
            />
            {errors.password && (
              <p id="user-password-error" className="text-xs text-red-600 mt-1">
                {errors.password}
              </p>
            )}
          </div>
        )}

        {/* Role & Status (Create Mode Only) */}
        {mode === 'create' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="user-role" className="block text-sm font-medium text-slate-700 mb-1">
                Role
              </label>
              <select
                id="user-role"
                value={values.role || 'viewer'}
                onChange={(e) => setField('role', e.target.value)}
                disabled={submitting}
                className="w-full px-3 py-2 rounded-md border border-slate-300 text-sm
                           focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white"
              >
                <option value="viewer">Viewer (Read-Only)</option>
                <option value="admin">Admin (Full Access)</option>
              </select>
            </div>

            <div>
              <label htmlFor="user-status" className="block text-sm font-medium text-slate-700 mb-1">
                Account Status
              </label>
              <select
                id="user-status"
                value={values.status || 'active'}
                onChange={(e) => setField('status', e.target.value)}
                disabled={submitting}
                className="w-full px-3 py-2 rounded-md border border-slate-300 text-sm
                           focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
}
