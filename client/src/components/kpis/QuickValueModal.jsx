// Reusable Quick Value Update Modal.
// Allows users to update just the currentValue (and optionally status) of a KPI
// without going through the entire full-edit form.

import { useState } from 'react';
import Modal from '../common/Modal.jsx';

export default function QuickValueModal({
  isOpen,
  onClose,
  onSubmit,
  kpi,
  submitting = false,
}) {
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  const [prevKpi, setPrevKpi] = useState(kpi);
  const [currentValue, setCurrentValue] = useState(
    isOpen && kpi ? String(kpi.currentValue ?? '0') : ''
  );
  const [status, setStatus] = useState(
    isOpen && kpi && kpi.status ? kpi.status : 'on_track'
  );
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  if (isOpen !== prevIsOpen || kpi !== prevKpi) {
    setPrevIsOpen(isOpen);
    setPrevKpi(kpi);
    if (isOpen && kpi) {
      setCurrentValue(String(kpi.currentValue ?? '0'));
      setStatus(kpi.status || 'on_track');
      setNote('');
      setError('');
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    const val = Number(currentValue);
    if (currentValue === '' || Number.isNaN(val) || val < 0) {
      setError('Current value must be a non-negative number');
      return;
    }

    if (note.length > 500) {
      setError('Note must be at most 500 characters');
      return;
    }

    onSubmit({
      currentValue: val,
      status,
      ...(note.trim() ? { note: note.trim() } : {}),
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
          <label htmlFor="quick-current-value" className="block text-sm font-medium text-slate-700 mb-1">
            New Current Value ({kpi.unit}) <span className="text-red-500">*</span>
          </label>
          <input
            id="quick-current-value"
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
          <label htmlFor="quick-status" className="block text-sm font-medium text-slate-700 mb-1">
            Status
          </label>
          <select
            id="quick-status"
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

        <div>
          <div className="flex justify-between items-center mb-1">
            <label htmlFor="quick-note" className="block text-sm font-medium text-slate-700">
              Change note (optional)
            </label>
            <span className="text-xs text-slate-400">{`${note.length}/500`}</span>
          </div>
          <textarea
            id="quick-note"
            rows={2}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Completed mid-quarter review"
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm
                       focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>
      </form>
    </Modal>
  );
}
