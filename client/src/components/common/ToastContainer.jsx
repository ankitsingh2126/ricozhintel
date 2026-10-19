// Renders the toast stack in the top-right corner.
// Reads toasts from ToastContext — no props needed.

import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useToast } from '../../context/useToast.js';

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const COLORS = {
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  info: 'bg-indigo-50 border-indigo-200 text-indigo-800',
};

const ICON_COLORS = {
  success: 'text-emerald-500',
  error: 'text-red-500',
  info: 'text-indigo-500',
};

export default function ToastContainer() {
  const { toasts, remove } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2 w-full max-w-sm">
      {toasts.map((t) => {
        const Icon = ICONS[t.variant] || Info;
        return (
          <div
            key={t.id}
            className={`flex items-start gap-3 rounded-lg border px-4 py-3 shadow-sm
              ${COLORS[t.variant] || COLORS.info}`}
            role="status"
          >
            <Icon size={18} className={`mt-0.5 shrink-0 ${ICON_COLORS[t.variant] || ''}`} />
            <div className="flex-1 text-sm">{t.message}</div>
            <button
              type="button"
              onClick={() => remove(t.id)}
              className="text-current opacity-60 hover:opacity-100"
              aria-label="Dismiss"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
