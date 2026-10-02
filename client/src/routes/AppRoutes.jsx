// Route table. Every page URL maps to a component here.

import { Routes, Route } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout.jsx';
import DashboardPage from '../pages/DashboardPage.jsx';
import DepartmentsPage from '../pages/DepartmentsPage.jsx';
import DepartmentDetailPage from '../pages/DepartmentDetailPage.jsx';
import KpisPage from '../pages/KpisPage.jsx';
import KpiDetailPage from '../pages/KpiDetailPage.jsx';
import NotFoundPage from '../pages/NotFoundPage.jsx';

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/departments" element={<DepartmentsPage />} />
        <Route path="/departments/:id" element={<DepartmentDetailPage />} />
        <Route path="/kpis" element={<KpisPage />} />
        <Route path="/kpis/:id" element={<KpiDetailPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
