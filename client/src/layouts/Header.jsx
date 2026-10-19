import { useNavigate } from 'react-router-dom';
import { Menu, UserCircle, LogOut, Shield } from 'lucide-react';
import { useAuth } from '../context/useAuth.js';

export default function Header({ title = 'Dashboard', onMenuClick }) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-slate-200">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3">
        <div className="flex items-center gap-3">
          <button
            className="lg:hidden text-slate-600 hover:text-slate-900"
            onClick={onMenuClick}
            aria-label="Open sidebar"
          >
            <Menu size={22} />
          </button>
          <h1 className="text-lg sm:text-xl font-semibold text-slate-900">{title}</h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <UserCircle size={24} className="text-slate-500" />
            <div className="hidden sm:flex flex-col items-start text-left">
              <span className="text-xs font-semibold text-slate-900 leading-tight">
                {user?.name || 'Authenticated User'}
              </span>
              <span className="text-[11px] text-slate-500 leading-tight">{user?.email}</span>
            </div>
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                isAdmin
                  ? 'bg-brand-50 text-brand-700 border-brand-200'
                  : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              {isAdmin && <Shield className="w-3 h-3 text-brand-600" />}
              {isAdmin ? 'Admin' : 'Viewer'}
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg border border-slate-200 transition-colors cursor-pointer"
            title="Log out"
            aria-label="Log out"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
