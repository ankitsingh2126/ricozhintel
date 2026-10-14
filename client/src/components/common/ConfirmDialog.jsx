// Confirmation dialog for destructive actions (delete, archive, etc.).
// Reuses Modal for the shell and adds Cancel / Confirm buttons.

import Modal from './Modal.jsx';

export default function ConfirmDialog({
  isOpen,
  onCancel,
  onConfirm,
  title = 'Confirm',
  message = 'Are you sure?',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  busy = false,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={busy ? undefined : onCancel}
      title={title}
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2 rounded-md border border-slate-300 text-sm font-medium
                       text-slate-700 bg-white hover:bg-slate-50
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`px-4 py-2 rounded-md text-sm font-medium text-white
              disabled:opacity-50 disabled:cursor-not-allowed
              ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-600 hover:bg-brand-700'}`}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      }
    >
      <p className="text-sm text-slate-700">{message}</p>
    </Modal>
  );
}
