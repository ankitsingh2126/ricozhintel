// Route table. Every page URL maps to a component here.
// Uses React.lazy() and Suspense for route-level code splitting.

import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout.jsx';
import ProtectedRoute from '../components/common/ProtectedRoute.jsx';
import Loader from '../components/common/Loader.jsx';

// Lazy-loaded page components for route-level bundle chunking
const LoginPage = lazy(() => import('../pages/LoginPage.jsx'));
const DashboardPage = lazy(() => import('../pages/DashboardPage.jsx'));
const DepartmentsPage = lazy(() => import('../pages/DepartmentsPage.jsx'));
const DepartmentDetailPage = lazy(() => import('../pages/DepartmentDetailPage.jsx'));
const KpisPage = lazy(() => import('../pages/KpisPage.jsx'));
const KpiDetailPage = lazy(() => import('../pages/KpiDetailPage.jsx'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage.jsx'));

// Suspense fallback wrapper consistent with application layout
function PageSuspense({ children, fullScreen = false }) {
  const fallback = fullScreen ? (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader label="Loading page…" />
    </div>
  ) : (
    <div className="py-12">
      <Loader label="Loading page…" />
    </div>
  );

  return <Suspense fallback={fallback}>{children}</Suspense>;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={
          <PageSuspense fullScreen>
            <LoginPage />
          </PageSuspense>
        }
      />

      {/* Protected routes requiring active session */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route
            path="/"
            element={
              <PageSuspense>
                <DashboardPage />
              </PageSuspense>
            }
          />
          <Route
            path="/departments"
            element={
              <PageSuspense>
                <DepartmentsPage />
              </PageSuspense>
            }
          />
          <Route
            path="/departments/:id"
            element={
              <PageSuspense>
                <DepartmentDetailPage />
              </PageSuspense>
            }
          />
          <Route
            path="/kpis"
            element={
              <PageSuspense>
                <KpisPage />
              </PageSuspense>
            }
          />
          <Route
            path="/kpis/:id"
            element={
              <PageSuspense>
                <KpiDetailPage />
              </PageSuspense>
            }
          />
          <Route
            path="*"
            element={
              <PageSuspense>
                <NotFoundPage />
              </PageSuspense>
            }
          />
        </Route>
      </Route>
    </Routes>
  );
}
