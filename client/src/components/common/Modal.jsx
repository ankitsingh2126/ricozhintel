// Reusable modal dialog.
//
// - Renders into a fixed overlay above everything else
// - Closes on Escape key and on overlay click
// - Locks page scroll while open
// - Keeps child content in a centered, responsive card
//
// Optional onBeforeClose: if provided, it is called before the modal closes.
// If it returns false, the close is cancelled. Used for "unsaved changes"
// guards on forms.

import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, onBeforeClose, title, children, footer }) {
  // Wraps any close action with the optional guard.
  const requestClose = () => {
    if (typeof onBeforeClose === 'function') {
      const allowed = onBeforeClose();
      if (allowed === false) return;
    }
    onClose?.();
  };

  // Lock body scroll + listen for Escape while open
  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (e) => {
      if (e.key === 'Escape') requestClose();
    };
    document.addEventListener('keydown', handleKey);

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = originalOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-slate-900/60"
        onClick={requestClose}
        aria-hidden="true"
      />

      {/* Card */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={requestClose}
            className="text-slate-400 hover:text-slate-700"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body (scrollable if content is tall) */}
        <div className="px-5 py-4 overflow-y-auto">{children}</div>

        {/* Footer (optional) */}
        {footer && (
          <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 rounded-b-lg">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}