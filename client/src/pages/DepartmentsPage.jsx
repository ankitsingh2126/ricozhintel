// Departments list page.

import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Building2, User } from 'lucide-react';
import PageHeader from '../components/common/PageHeader.jsx';
import Loader from '../components/common/Loader.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import { fetchDepartments } from '../services/departmentService.js';
import { useFetch } from '../hooks/useFetch.js';

export default function DepartmentsPage() {
  const fetcher = useCallback(() => fetchDepartments({ limit: 100 }), []);
  const { data, loading, error, refetch } = useFetch(fetcher, []);

  return (
    <div>
      <PageHeader
        title="Departments"
        description="All departments across the organization."
      />

      {loading && <Loader label="Loading departments…" />}

      {!loading && error && (
        <ErrorState message={error.message} onRetry={refetch} />
      )}

      {!loading && !error && data && data.items.length === 0 && (
        <EmptyState
          title="No departments yet"
          description="Run `npm run seed` in the server folder to populate sample data."
        />
      )}

      {!loading && !error && data && data.items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.items.map((dept) => (
            <Link
              key={dept._id}
              to={`/departments/${dept._id}`}
              className="block bg-white border border-slate-200 rounded-lg p-4 hover:border-brand-500 hover:shadow-sm transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md bg-brand-50 text-brand-600 flex items-center justify-center">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <div className="font-medium text-slate-900">{dept.name}</div>
                    <div className="text-xs text-slate-500">{dept.code}</div>
                  </div>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border
                    ${dept.status === 'active'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'}`}
                >
                  {dept.status}
                </span>
              </div>

              {dept.head && (
                <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                  <User size={14} />
                  <span>{dept.head}</span>
                </div>
              )}
              {dept.description && (
                <p className="mt-2 text-sm text-slate-500 line-clamp-2">{dept.description}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
