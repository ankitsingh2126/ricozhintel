// Tests for DepartmentDetailPage:
// Department metadata, associated KPIs, Add KPI modal with prefilled context,
// 404 / error states, retry behaviour, and RBAC action visibility.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import DepartmentDetailPage from '../pages/DepartmentDetailPage.jsx';
import ToastContainer from '../components/common/ToastContainer.jsx';
import { renderWithProviders, mockAdminUser, mockViewerUser } from './testUtils.jsx';
import * as departmentService from '../services/departmentService.js';
import * as kpiService from '../services/kpiService.js';
import { apiClient } from '../services/apiClient.js';

vi.mock('../services/departmentService.js');
vi.mock('../services/kpiService.js');
vi.mock('../services/apiClient.js');

describe('DepartmentDetailPage Integration Tests', () => {
  const sampleDepartment = {
    _id: 'dept-eng',
    name: 'Engineering',
    code: 'ENG',
    head: 'Alice Engineer',
    description: 'Product architecture and engineering systems',
    status: 'active',
  };

  const sampleKpis = [
    {
      _id: 'kpi-1',
      name: 'System Uptime',
      code: 'ENG-UPT',
      department: { _id: 'dept-eng', name: 'Engineering', code: 'ENG' },
      target: 99.9,
      currentValue: 99.5,
      achievement: 99,
      unit: '%',
      status: 'on_track',
      period: 'monthly',
      owner: 'Alice Engineer',
      statusRule: 'higher_is_better',
    },
    {
      _id: 'kpi-2',
      name: 'Critical Incident Count',
      code: 'ENG-INC',
      department: { _id: 'dept-eng', name: 'Engineering', code: 'ENG' },
      target: 2,
      currentValue: 4,
      achievement: 50,
      unit: 'count',
      status: 'off_track',
      period: 'monthly',
      owner: 'Bob Reliability',
      statusRule: 'lower_is_better',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    departmentService.fetchDepartmentById.mockResolvedValue(sampleDepartment);
    kpiService.fetchKpis.mockResolvedValue({
      items: sampleKpis,
      meta: { page: 1, pages: 1, total: 2, limit: 100 },
    });
    apiClient.post.mockResolvedValue({
      data: { success: true, data: { _id: 'kpi-new', name: 'Code Coverage' } },
    });
  });

  function renderDetailPage(deptId = 'dept-eng', authState = { user: mockAdminUser, isAdmin: true }) {
    return renderWithProviders(
      <>
        <Routes>
          <Route path="/departments/:id" element={<DepartmentDetailPage />} />
          <Route path="/departments" element={<div>Departments List Page</div>} />
          <Route path="/kpis/:id" element={<div>KPI Detail Page</div>} />
        </Routes>
        <ToastContainer />
      </>,
      {
        route: `/departments/${deptId}`,
        authState,
      }
    );
  }

  describe('Department Metadata & Info Display', () => {
    it('renders department name, description, code, head, and status', async () => {
      renderDetailPage();

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Engineering', level: 2 })).toBeInTheDocument();
      });

      expect(screen.getByText('Product architecture and engineering systems')).toBeInTheDocument();

      // Check stat cards
      expect(screen.getAllByText('Code').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('ENG')).toBeInTheDocument();
      expect(screen.getByText('Head')).toBeInTheDocument();
      expect(screen.getByText('Alice Engineer')).toBeInTheDocument();
      expect(screen.getAllByText('Status').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('active')).toBeInTheDocument();

      // Back navigation link
      const backLink = screen.getByRole('link', { name: /back to departments/i });
      expect(backLink).toBeInTheDocument();
      expect(backLink).toHaveAttribute('href', '/departments');
    });

    it('renders fallback description and dash when description and head are not provided', async () => {
      departmentService.fetchDepartmentById.mockResolvedValueOnce({
        _id: 'dept-minimal',
        name: 'Operations',
        code: 'OPS',
        head: '',
        description: '',
        status: 'active',
      });

      renderDetailPage('dept-minimal');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Operations', level: 2 })).toBeInTheDocument();
      });

      // Description falls back to "Code: OPS"
      expect(screen.getByText('Code: OPS')).toBeInTheDocument();
      // Head falls back to "—"
      expect(screen.getByText('—')).toBeInTheDocument();
    });
  });

  describe('Associated KPI List Display', () => {
    it('renders list of KPIs with target, current, progress, and status badge', async () => {
      renderDetailPage();

      await waitFor(() => {
        expect(screen.getByText('System Uptime')).toBeInTheDocument();
      });

      expect(screen.getByText('ENG-UPT')).toBeInTheDocument();
      expect(screen.getByText('99.9 %')).toBeInTheDocument();
      expect(screen.getByText('99.5 %')).toBeInTheDocument();
      expect(screen.getByText('100%')).toBeInTheDocument(); // round(99.5/99.9 * 100) = 100%
      expect(screen.getByText('On Track')).toBeInTheDocument();

      // Second KPI
      expect(screen.getByText('Critical Incident Count')).toBeInTheDocument();
      expect(screen.getByText('ENG-INC')).toBeInTheDocument();
      expect(screen.getByText('2 count')).toBeInTheDocument();
      expect(screen.getByText('4 count')).toBeInTheDocument();
      expect(screen.getByText('Off Track')).toBeInTheDocument();

      // Check link to KPI detail
      const kpiLink = screen.getByRole('link', { name: 'System Uptime' });
      expect(kpiLink).toHaveAttribute('href', '/kpis/kpi-1');
    });

    it('renders empty state when department has no KPIs', async () => {
      kpiService.fetchKpis.mockResolvedValueOnce({
        items: [],
        meta: { page: 1, pages: 1, total: 0, limit: 100 },
      });

      renderDetailPage('dept-eng', { user: mockAdminUser, isAdmin: true });

      await waitFor(() => {
        expect(screen.getByText('No KPIs yet')).toBeInTheDocument();
      });

      expect(
        screen.getByText(/this department has no kpis assigned. click 'add kpi' above to create one./i)
      ).toBeInTheDocument();
    });
  });

  describe('Add KPI Workflow and Context Prefill', () => {
    it('opens Add KPI modal with department context prefilled, submits, and displays success toast', async () => {
      const user = userEvent.setup();
      renderDetailPage('dept-eng');

      await waitFor(() => {
        expect(screen.getByText('Engineering')).toBeInTheDocument();
      });

      const addBtn = screen.getByRole('button', { name: /add kpi/i });
      await user.click(addBtn);

      // Verify modal opened with Add KPI heading
      expect(screen.getByRole('heading', { name: /add kpi/i, level: 2 })).toBeInTheDocument();

      // Department dropdown should have dept-eng prefilled
      const deptSelect = screen.getByLabelText(/department/i);
      expect(deptSelect).toHaveValue('dept-eng');

      // Fill in required fields
      await user.type(screen.getByLabelText(/^name/i), 'Code Coverage');
      await user.type(screen.getByLabelText(/^code/i), 'cov-eng');
      await user.clear(screen.getByLabelText(/^target/i));
      await user.type(screen.getByLabelText(/^target/i), '85');

      const submitBtn = screen.getByRole('button', { name: /create kpi/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith(
          '/kpis',
          expect.objectContaining({
            name: 'Code Coverage',
            code: 'COV-ENG',
            department: 'dept-eng',
            target: 85,
          })
        );
        expect(screen.getByText('KPI "Code Coverage" created')).toBeInTheDocument();
      });

      // Modal closes after creation
      expect(screen.queryByRole('heading', { name: /add kpi/i, level: 2 })).not.toBeInTheDocument();

      // Refetches KPIs
      expect(kpiService.fetchKpis).toHaveBeenCalledWith({ department: 'dept-eng', limit: 100 });
    });

    it('shows error toast when creating KPI fails', async () => {
      const user = userEvent.setup();
      apiClient.post.mockRejectedValueOnce({
        message: 'KPI code must be unique',
      });

      renderDetailPage('dept-eng');

      await waitFor(() => {
        expect(screen.getByText('Engineering')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /add kpi/i }));

      await user.type(screen.getByLabelText(/^name/i), 'Duplicate KPI');
      await user.type(screen.getByLabelText(/^code/i), 'eng-dup');
      await user.type(screen.getByLabelText(/^target/i), '50');

      await user.click(screen.getByRole('button', { name: /create kpi/i }));

      await waitFor(() => {
        expect(screen.getByText('KPI code must be unique')).toBeInTheDocument();
      });

      // Modal stays open on error
      expect(screen.getByRole('heading', { name: /add kpi/i, level: 2 })).toBeInTheDocument();
    });
  });

  describe('Missing Department / Error States', () => {
    it('displays error state when department fetch fails with 404', async () => {
      departmentService.fetchDepartmentById.mockRejectedValueOnce(
        new Error('Department not found')
      );

      renderDetailPage('dept-nonexistent');

      await waitFor(() => {
        expect(screen.getByText('Department not found')).toBeInTheDocument();
      });

      expect(screen.queryByRole('heading', { name: 'Engineering', level: 2 })).not.toBeInTheDocument();
    });

    it('displays error state when fetching associated KPIs fails', async () => {
      kpiService.fetchKpis.mockRejectedValueOnce(
        new Error('Failed to load department KPIs')
      );

      renderDetailPage('dept-eng');

      await waitFor(() => {
        expect(screen.getByText('Failed to load department KPIs')).toBeInTheDocument();
      });
    });
  });

  describe('Retry Behaviour', () => {
    it('retries fetching department and KPIs when Retry button is clicked', async () => {
      const user = userEvent.setup();
      departmentService.fetchDepartmentById.mockRejectedValueOnce(
        new Error('Network error loading department')
      );

      renderDetailPage('dept-eng');

      await waitFor(() => {
        expect(screen.getByText('Network error loading department')).toBeInTheDocument();
      });

      // Subsequent fetch will succeed
      departmentService.fetchDepartmentById.mockResolvedValueOnce(sampleDepartment);

      const retryBtn = screen.getByRole('button', { name: /retry/i });
      await user.click(retryBtn);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Engineering', level: 2 })).toBeInTheDocument();
      });
      expect(screen.getByText('System Uptime')).toBeInTheDocument();
    });
  });

  describe('RBAC Action Visibility', () => {
    it('Admin sees Add KPI button and admin instructions in empty state', async () => {
      kpiService.fetchKpis.mockResolvedValueOnce({
        items: [],
        meta: { page: 1, pages: 1, total: 0, limit: 100 },
      });

      renderDetailPage('dept-eng', { user: mockAdminUser, isAdmin: true });

      await waitFor(() => {
        expect(screen.getByText('Engineering')).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /add kpi/i })).toBeInTheDocument();
      expect(screen.getByText(/click 'add kpi' above to create one/i)).toBeInTheDocument();
    });

    it('Viewer does not see Add KPI button and sees read-only empty state prompt', async () => {
      kpiService.fetchKpis.mockResolvedValueOnce({
        items: [],
        meta: { page: 1, pages: 1, total: 0, limit: 100 },
      });

      renderDetailPage('dept-eng', { user: mockViewerUser, isAdmin: false });

      await waitFor(() => {
        expect(screen.getByText('Engineering')).toBeInTheDocument();
      });

      expect(screen.queryByRole('button', { name: /add kpi/i })).not.toBeInTheDocument();
      expect(screen.getByText(/this department currently has no kpis assigned/i)).toBeInTheDocument();
      expect(screen.queryByText(/click 'add kpi' above to create one/i)).not.toBeInTheDocument();
    });
  });
});
