// Shown when a request fails. Includes a Retry button.

import { AlertCircle } from 'lucide-react';

export default function ErrorState({ message = 'Something went wrong.', onRetry }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
      <AlertCircle className="mx-auto text-red-500" size={32} />
      <p className="mt-2 text-sm text-red-700">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 px-4 py-2 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700"
        >
          Retry
        </button>
      )}
    </div>
  );
}
