// Reusable KPI form modal.
// Used by both the KPIs list page and the KPI detail page.
// Owns form state, client-side validation, and unsaved-changes guard.

import { useEffect, useState } from 'react';
import Modal from '../common/Modal.jsx';

const STATUS_FORM_OPTIONS = [
  { value: 'on_track',  label: 'On Track' },
  { value: 'at_risk',   label: 'At Risk' },
  { value: 'off_track', label: 'Off Track' },
  { value: 'completed', label: 'Completed' },
];

const PERIOD_FORM_OPTIONS = [
  { value: 'monthly',   label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly',    label: 'Yearly' },
];

const STATUS_RULE_OPTIONS = [
  { value: 'higher_is_better', label: 'Higher is better (e.g. revenue)' },
  { value: 'lower_is_better',  label: 'Lower is better (e.g. response time)' },
];

export const EMPTY_KPI_FORM = {
  name: '',
  code: '',
  department: '',
  unit: '%',
  target: '',
  currentValue: '0',
  status: 'on_track',
  period: 'monthly',
  owner: '',
  statusRule: 'higher_is_better',
};

const isDirty = (a, b) => {
  if (!a || !b) return false;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if ((a[key] ?? '') !== (b[key] ?? '')) return true;
  }
  return false;
};

export default function KpiFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialValues,
  mode,
  submitting,
  departments,
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
    }

    const code = values.code.trim();
    if (!code || code.length < 2 || code.length > 20) {
      next.code = 'Code must be 2-20 characters';
    } else if (!/^[A-Za-z0-9_-]+$/.test(code)) {
      next.code = 'Code may only contain letters, numbers, hyphens, underscores';
    }

    if (!values.department) {
      next.department = 'Department is required';
    }

    const target = Number(values.target);
    if (values.target === '' || Number.isNaN(target) || target < 0) {
      next.target = 'Target must be a non-negative number';
    }

    const currentValue = Number(values.currentValue);
    if (values.currentValue !== '' && (Number.isNaN(currentValue) || currentValue < 0)) {
      next.currentValue = 'Current value must be a non-negative number';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(values);
  };

  const guardClose = () => {
    if (submitting) return false;
    if (!isDirty(values, initialValues)) return true;
    return window.confirm('Discard unsaved changes?');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onBeforeClose={guardClose}
      title={mode === 'edit' ? 'Edit KPI' : 'Add KPI'}
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
            form="kpi-form"
            disabled={submitting}
            className="px-4 py-2 rounded-md bg-brand-600 text-white text-sm font-medium
                       hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Saving…' : mode === 'edit' ? 'Save Changes' : 'Create KPI'}
          </button>
        </div>
      }
    >
      <form id="kpi-form" onSubmit={handleSubmit} className="space-y-4">
        <Field
          id="kpi-name"
          label="Name"
          required
          value={values.name}
          onChange={(v) => setField('name', v)}
          error={errors.name}
          placeholder="e.g. Monthly Revenue"
        />
        <Field
          id="kpi-code"
          label="Code"
          required
          value={values.code}
          onChange={(v) => setField('code', v.toUpperCase())}
          error={errors.code}
          placeholder="e.g. SAL-REV"
          maxLength={20}
        />

        <div>
          <label htmlFor="kpi-department" className="block text-sm font-medium text-slate-700 mb-1">
            Department <span className="text-red-500">*</span>
          </label>
          <select
            id="kpi-department"
            value={values.department}
            onChange={(e) => setField('department', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md text-sm bg-white
              focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent
              ${errors.department ? 'border-red-300' : 'border-slate-300'}`}
          >
            <option value="">— Select a department —</option>
            {departments.map((d) => (
              <option key={d._id} value={d._id}>{d.name}</option>
            ))}
          </select>
          {errors.department && <p className="mt-1 text-xs text-red-600">{errors.department}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field
            id="kpi-target"
            label="Target"
            required
            value={values.target}
            onChange={(v) => setField('target', v)}
            error={errors.target}
            placeholder="e.g. 500000"
            type="number"
          />
          <Field
            id="kpi-current-value"
            label="Current Value"
            value={values.currentValue}
            onChange={(v) => setField('currentValue', v)}
            error={errors.currentValue}
            placeholder="e.g. 420000"
            type="number"
          />
          <Field
            id="kpi-unit"
            label="Unit"
            value={values.unit}
            onChange={(v) => setField('unit', v)}
            error={errors.unit}
            placeholder="e.g. USD, %, count"
            maxLength={10}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectField
            id="kpi-status"
            label="Status"
            value={values.status}
            onChange={(v) => setField('status', v)}
            options={STATUS_FORM_OPTIONS}
          />
          <SelectField
            id="kpi-period"
            label="Period"
            value={values.period}
            onChange={(v) => setField('period', v)}
            options={PERIOD_FORM_OPTIONS}
          />
        </div>

        <Field
          id="kpi-owner"
          label="Owner"
          value={values.owner}
          onChange={(v) => setField('owner', v)}
          placeholder="e.g. Alice Chen (optional)"
          maxLength={120}
        />

        <SelectField
          id="kpi-achievement-rule"
          label="Achievement Rule"
          value={values.statusRule}
          onChange={(v) => setField('statusRule', v)}
          options={STATUS_RULE_OPTIONS}
        />
      </form>
    </Modal>
  );
}

function Field({ id, label, required, value, onChange, error, placeholder, textarea, maxLength, type = 'text' }) {
  const inputId = id || `kpi-${label.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
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

function SelectField({ id, label, value, onChange, options, error }) {
  const selectId = id || `kpi-select-${label.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
  return (
    <div>
      <label htmlFor={selectId} className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <select
        id={selectId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-3 py-2 border rounded-md text-sm bg-white
          focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent
          ${error ? 'border-red-300' : 'border-slate-300'}`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}