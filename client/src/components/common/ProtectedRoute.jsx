// Route guard requiring authentication and optional role authorization.
// Redirects unauthenticated users to /login preserving target route in state.
// Redirects unauthorized users (e.g. non-admins on admin-only routes) to / with replace.

import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/useAuth.js';
import Loader from './Loader.jsx';

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader label="Verifying session..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children ? children : <Outlet />;
}
