// Top header bar. Shows the page title and a placeholder user menu.
// The hamburger button opens the sidebar on mobile.

import { Menu, UserCircle } from 'lucide-react';

export default function Header({ title = 'Dashboard', onMenuClick }) {
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

        <div className="flex items-center gap-2 text-slate-600">
          <UserCircle size={26} />
          <span className="hidden sm:inline text-sm">Executive User</span>
        </div>
      </div>
    </header>
  );
}
