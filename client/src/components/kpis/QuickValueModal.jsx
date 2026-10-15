// Reusable Quick Value Update Modal.
// Allows users to update just the currentValue (and optionally status) of a KPI
// without going through the entire full-edit form.

import { useEffect, useState } from 'react';
import Modal from '../common/Modal.jsx';

export default function QuickValueModal({
  isOpen,
  onClose,
  onSubmit,
  kpi,
  submitting = false,
}) {
  const [currentValue, setCurrentValue] = useState('');
  const [status, setStatus] = useState('on_track');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && kpi) {
      setCurrentValue(String(kpi.currentValue ?? '0'));
      setStatus(kpi.status || 'on_track');
      setError('');
    }
  }, [isOpen, kpi]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const val = Number(currentValue);
    if (currentValue === '' || Number.isNaN(val) || val < 0) {
      setError('Current value must be a non-negative number');
      return;
    }

    onSubmit({
      currentValue: val,
      status,
    });
  };

  if (!kpi) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={submitting ? undefined : onClose}
      title={`Update KPI Value: ${kpi.name}`}
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
            form="quick-value-form"
            disabled={submitting}
            className="px-4 py-2 rounded-md bg-brand-600 text-white text-sm font-medium
                       hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Updating…' : 'Update Value'}
          </button>
        </div>
      }
    >
      <form id="quick-value-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-slate-50 border border-slate-200 rounded-md p-3 text-sm flex justify-between">
          <div>
            <span className="text-slate-500">Target:</span>{' '}
            <span className="font-medium text-slate-800">
              {kpi.target} {kpi.unit}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Current:</span>{' '}
            <span className="font-medium text-slate-800">
              {kpi.currentValue} {kpi.unit}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Rule:</span>{' '}
            <span className="font-medium text-slate-800 capitalize">
              {kpi.statusRule ? kpi.statusRule.replace(/_/g, ' ') : 'higher is better'}
            </span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            New Current Value ({kpi.unit}) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={currentValue}
            onChange={(e) => {
              setCurrentValue(e.target.value);
              if (error) setError('');
            }}
            placeholder="e.g. 500"
            className={`w-full px-3 py-2 border rounded-md text-sm
              focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent
              ${error ? 'border-red-300' : 'border-slate-300'}`}
            autoFocus
          />
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white
                       focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          >
            <option value="on_track">On Track</option>
            <option value="at_risk">At Risk</option>
            <option value="off_track">Off Track</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </form>
    </Modal>
  );
}
