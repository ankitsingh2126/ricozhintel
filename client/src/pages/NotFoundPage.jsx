import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl font-bold text-slate-300">404</div>
        <h2 className="mt-2 text-xl font-semibold text-slate-900">Page not found</h2>
        <p className="mt-1 text-sm text-slate-500">The page you requested doesn’t exist.</p>
        <Link
          to="/"
          className="inline-block mt-5 px-4 py-2 rounded-md bg-brand-600 text-white text-sm font-medium hover:bg-brand-700"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
