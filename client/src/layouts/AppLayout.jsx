// App shell. Sidebar on the left, header + content on the right.
// Uses <Outlet /> from react-router to render the current page.

import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';
import { NAV_ITEMS } from '../utils/constants.js';

// Derive a page title from the current path.
const titleForPath = (path) => {
  if (path === '/') return 'Dashboard';
  const match = NAV_ITEMS.find((item) => path.startsWith(item.path) && item.path !== '/');
  if (match) return match.label;
  if (path.startsWith('/departments')) return 'Departments';
  if (path.startsWith('/kpis')) return 'KPIs';
  return 'Ricozhintel';
};

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:pl-64">
        <Header title={titleForPath(location.pathname)} onMenuClick={() => setSidebarOpen(true)} />
        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
