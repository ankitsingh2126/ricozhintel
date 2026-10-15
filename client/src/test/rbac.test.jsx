// Tests for Role-Based Access Control (RBAC): Admin vs Viewer UI controls.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import DepartmentsPage from '../pages/DepartmentsPage.jsx';
import DepartmentDetailPage from '../pages/DepartmentDetailPage.jsx';
import KpisPage from '../pages/KpisPage.jsx';
import KpiDetailPage from '../pages/KpiDetailPage.jsx';
import { renderWithProviders, mockAdminUser, mockViewerUser } from './testUtils.jsx';
import * as departmentService from '../services/departmentService.js';
import * as kpiService from '../services/kpiService.js';
import { apiClient } from '../services/apiClient.js';

// Mock service APIs
vi.mock('../services/departmentService.js');
vi.mock('../services/kpiService.js');
vi.mock('../services/apiClient.js');

describe('Role-Based Access Control (RBAC) UI Action Guards', () => {
  const sampleDepartment = {
    _id: 'dept-101',
    name: 'Engineering',
    code: 'ENG',
    head: 'Alice Engineer',
    description: 'Product tech stack',
    status: 'active',
  };

  const sampleKpi = {
    _id: 'kpi-202',
    name: 'Sprint Velocity',
    code: 'ENG-VEL',
    department: { _id: 'dept-101', name: 'Engineering', code: 'ENG' },
    target: 80,
    currentValue: 72,
    achievement: 90,
    unit: 'points',
    status: 'on_track',
    period: 'monthly',
    owner: 'Alice Engineer',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    departmentService.fetchDepartments.mockResolvedValue({
      items: [sampleDepartment],
      meta: { page: 1, pages: 1, total: 1, limit: 10 },
    });

    departmentService.fetchDepartmentById.mockResolvedValue(sampleDepartment);

    kpiService.fetchKpis.mockResolvedValue({
      items: [sampleKpi],
      meta: { page: 1, pages: 1, total: 1, limit: 10 },
    });

    apiClient.get.mockImplementation((url) => {
      if (url.includes('/kpis/')) {
        return Promise.resolve({ data: { success: true, data: sampleKpi } });
      }
      return Promise.resolve({ data: { success: true, data: {} } });
    });
  });

  describe('DepartmentsPage RBAC', () => {
    it('Admin sees Add Department button and card Edit/Delete controls', async () => {
      renderWithProviders(<DepartmentsPage />, {
        authState: { user: mockAdminUser, isAdmin: true },
      });

      await waitFor(() => {
        expect(screen.getByText('Engineering')).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /add department/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^edit$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^delete$/i })).toBeInTheDocument();
    });

    it('Viewer can browse departments but Add Department and card Edit/Delete are hidden', async () => {
      renderWithProviders(<DepartmentsPage />, {
        authState: { user: mockViewerUser, isAdmin: false },
      });

      await waitFor(() => {
        expect(screen.getByText('Engineering')).toBeInTheDocument();
      });

      expect(screen.queryByRole('button', { name: /add department/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^edit$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^delete$/i })).not.toBeInTheDocument();
    });
  });

  describe('DepartmentDetailPage RBAC', () => {
    beforeEach(() => {
      kpiService.fetchKpis.mockResolvedValue({
        items: [],
        meta: { page: 1, pages: 1, total: 0, limit: 10 },
      });
    });

    it('Admin sees Add KPI button on department detail', async () => {
      renderWithProviders(<DepartmentDetailPage />, {
        route: '/departments/dept-101',
        authState: { user: mockAdminUser, isAdmin: true },
      });

      await waitFor(() => {
        expect(screen.getByText('Engineering')).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /add kpi/i })).toBeInTheDocument();
      expect(screen.getByText(/click 'add kpi' above to create one/i)).toBeInTheDocument();
    });

    it('Viewer cannot see Add KPI button and sees read-only empty state description', async () => {
      renderWithProviders(<DepartmentDetailPage />, {
        route: '/departments/dept-101',
        authState: { user: mockViewerUser, isAdmin: false },
      });

      await waitFor(() => {
        expect(screen.getByText('Engineering')).toBeInTheDocument();
      });

      expect(screen.queryByRole('button', { name: /add kpi/i })).not.toBeInTheDocument();
      expect(screen.getByText(/this department currently has no kpis assigned/i)).toBeInTheDocument();
    });
  });

  describe('KpisPage RBAC', () => {
    it('Admin sees Add KPI, Export CSV, and table Actions column (Value, Edit, Delete)', async () => {
      renderWithProviders(<KpisPage />, {
        authState: { user: mockAdminUser, isAdmin: true },
      });

      await waitFor(() => {
        expect(screen.getByText('Sprint Velocity')).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /add kpi/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /export csv/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /actions/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /value/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^edit$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^delete$/i })).toBeInTheDocument();
    });

    it('Viewer sees Export CSV and KPI data, but Add KPI and Actions column are hidden', async () => {
      renderWithProviders(<KpisPage />, {
        authState: { user: mockViewerUser, isAdmin: false },
      });

      await waitFor(() => {
        expect(screen.getByText('Sprint Velocity')).toBeInTheDocument();
      });

      // Viewers retain export ability and data view
      expect(screen.getByRole('button', { name: /export csv/i })).toBeInTheDocument();
      expect(screen.getByText('ENG-VEL')).toBeInTheDocument();

      // Mutating buttons and Actions column are hidden
      expect(screen.queryByRole('button', { name: /add kpi/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('columnheader', { name: /actions/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /value/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^edit$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^delete$/i })).not.toBeInTheDocument();
    });
  });

  describe('KpiDetailPage RBAC', () => {
    it('Admin sees Update Value, Edit, and Delete action buttons', async () => {
      renderWithProviders(<KpiDetailPage />, {
        route: '/kpis/kpi-202',
        authState: { user: mockAdminUser, isAdmin: true },
      });

      await waitFor(() => {
        expect(screen.getByText('Sprint Velocity')).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /update value/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^edit$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^delete$/i })).toBeInTheDocument();
    });

    it('Viewer sees KPI metrics and status badge, but mutating buttons are hidden', async () => {
      renderWithProviders(<KpiDetailPage />, {
        route: '/kpis/kpi-202',
        authState: { user: mockViewerUser, isAdmin: false },
      });

      await waitFor(() => {
        expect(screen.getByText('Sprint Velocity')).toBeInTheDocument();
      });

      // Status badge and metric details visible
      expect(screen.getByText(/on track/i)).toBeInTheDocument();
      expect(screen.getByText(/72 points/i)).toBeInTheDocument();

      // Mutating buttons are hidden
      expect(screen.queryByRole('button', { name: /update value/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^edit$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^delete$/i })).not.toBeInTheDocument();
    });
  });
});
