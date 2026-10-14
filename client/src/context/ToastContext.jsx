// Toast notification system.
// Usage:
//   const { showSuccess, showError, showInfo } = useToast();
//   showSuccess('Department saved');
//   showError('Could not save — check the form');
//
// Toasts auto-dismiss after 4 seconds and can be closed manually.

import { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(null);

let nextId = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (variant, message, duration = 4000) => {
      const id = nextId++;
      setToasts((prev) => [...prev, { id, variant, message }]);
      if (duration > 0) {
        setTimeout(() => remove(id), duration);
      }
      return id;
    },
    [remove]
  );

  const showSuccess = useCallback((msg, duration) => push('success', msg, duration), [push]);
  const showError = useCallback((msg, duration) => push('error', msg, duration), [push]);
  const showInfo = useCallback((msg, duration) => push('info', msg, duration), [push]);

  const value = { toasts, showSuccess, showError, showInfo, remove };

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used inside <ToastProvider>');
  }
  return ctx;
}
