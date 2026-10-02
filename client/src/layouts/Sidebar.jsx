// Sidebar navigation.
// Fixed on desktop; slides in/out on mobile via a prop from AppLayout.

import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Building2, Target, X } from 'lucide-react';
import { NAV_ITEMS, APP_NAME, APP_TAGLINE } from '../utils/constants.js';

const ICONS = { LayoutDashboard, Building2, Target };

export default function Sidebar({ isOpen, onClose }) {
  return (
    <>
      {/* Dark overlay on mobile when sidebar is open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 z-40 h-full w-64 bg-slate-900 text-slate-100
          transform transition-transform duration-200 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        {/* Brand / logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-slate-800">
          <div>
            <div className="text-lg font-semibold text-white">{APP_NAME}</div>
            <div className="text-xs text-slate-400">{APP_TAGLINE}</div>
          </div>
          <button
            className="lg:hidden text-slate-400 hover:text-white"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav links */}
        <nav className="px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = ICONS[item.icon];
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition
                   ${isActive
                     ? 'bg-brand-600 text-white'
                     : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`
                }
              >
                {Icon && <Icon size={18} />}
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 px-5 py-4 border-t border-slate-800 text-xs text-slate-500">
          Milestone 1 · Foundation
        </div>
      </aside>
    </>
  );
}
