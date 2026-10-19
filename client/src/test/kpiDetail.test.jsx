// Tests for KpiDetailPage:
// KPI metadata rendering, target and progress metrics, statusRule in edit modal,
// Quick Value modal updates, Edit modal workflow, ConfirmDialog delete with navigation,
// 404 / error states, retry behaviour, and RBAC action visibility.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import KpiDetailPage from '../pages/KpiDetailPage.jsx';
import ToastContainer from '../components/common/ToastContainer.jsx';
import { renderWithProviders, mockAdminUser, mockViewerUser } from './testUtils.jsx';
import * as departmentService from '../services/departmentService.js';
import { apiClient } from '../services/apiClient.js';

vi.mock('../services/departmentService.js');
vi.mock('../services/apiClient.js');

describe('KpiDetailPage Integration Tests', () => {
  const sampleDepartment = {
    _id: 'dept-sales',
    name: 'Sales',
    code: 'SAL',
  };

  const sampleKpi = {
    _id: 'kpi-rev',
    name: 'Quarterly Revenue',
    code: 'SAL-REV',
    department: sampleDepartment,
    target: 1000000,
    currentValue: 750000,
    achievement: 75,
    unit: 'USD',
    status: 'on_track',
    period: 'quarterly',
    owner: 'Carol Sales',
    description: 'Total contracted revenue for the quarter',
    statusRule: 'higher_is_better',
  };

  const sampleKpiLower = {
    _id: 'kpi-latency',
    name: 'P99 API Latency',
    code: 'ENG-LAT',
    department: { _id: 'dept-eng', name: 'Engineering', code: 'ENG' },
    target: 150,
    currentValue: 180,
    achievement: 83,
    unit: 'ms',
    status: 'at_risk',
    period: 'monthly',
    owner: 'Dave Reliability',
    description: 'P99 latency threshold for user endpoints',
    statusRule: 'lower_is_better',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    departmentService.fetchDepartments.mockResolvedValue({
      items: [sampleDepartment, { _id: 'dept-eng', name: 'Engineering', code: 'ENG' }],
      meta: { page: 1, pages: 1, total: 2, limit: 100 },
    });

    apiClient.get.mockImplementation((url) => {
      if (url.includes('/kpis/kpi-latency')) {
        return Promise.resolve({ data: { success: true, data: sampleKpiLower } });
      }
      if (url.includes('/kpis/')) {
        return Promise.resolve({ data: { success: true, data: sampleKpi } });
      }
      return Promise.resolve({ data: { success: true, data: {} } });
    });

    apiClient.patch.mockResolvedValue({
      data: { success: true, data: sampleKpi },
    });

    apiClient.delete.mockResolvedValue({
      data: { success: true, message: 'KPI deleted' },
    });
  });

  function renderDetailPage(kpiId = 'kpi-rev', authState = { user: mockAdminUser, isAdmin: true }) {
    return renderWithProviders(
      <>
        <Routes>
          <Route path="/kpis/:id" element={<KpiDetailPage />} />
          <Route path="/kpis" element={<div>KPIs List Page</div>} />
          <Route path="/departments/:id" element={<div>Department Detail Page</div>} />
        </Routes>
        <ToastContainer />
      </>,
      {
        route: `/kpis/${kpiId}`,
        authState,
      }
    );
  }

  describe('KPI Metadata & Metric Rendering', () => {
    it('renders KPI name, description, code, status badge, department link, period, unit, owner, target, and progress', async () => {
      renderDetailPage();

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Quarterly Revenue', level: 2 })).toBeInTheDocument();
      });

      // Description and Status
      expect(screen.getByText('Total contracted revenue for the quarter')).toBeInTheDocument();
      expect(screen.getByText('On Track')).toBeInTheDocument();

      // Department stat card with link
      const deptLink = screen.getByRole('link', { name: 'Sales' });
      expect(deptLink).toBeInTheDocument();
      expect(deptLink).toHaveAttribute('href', '/departments/dept-sales');

      // Period and Unit cards
      expect(screen.getByText('Period')).toBeInTheDocument();
      expect(screen.getByText('quarterly')).toBeInTheDocument();
      expect(screen.getByText('Unit')).toBeInTheDocument();
      expect(screen.getByText('USD')).toBeInTheDocument();

      // Owner card
      expect(screen.getByText('Owner')).toBeInTheDocument();
      expect(screen.getByText('Carol Sales')).toBeInTheDocument();

      // Target, Current, and Progress
      expect(screen.getByText('Current')).toBeInTheDocument();
      expect(screen.getByText('750,000 USD')).toBeInTheDocument();
      expect(screen.getByText('Target')).toBeInTheDocument();
      expect(screen.getByText('1,000,000 USD')).toBeInTheDocument();
      expect(screen.getByText('75% of target reached')).toBeInTheDocument();

      // Back navigation link
      const backLink = screen.getByRole('link', { name: /back to kpis/i });
      expect(backLink).toBeInTheDocument();
      expect(backLink).toHaveAttribute('href', '/kpis');
    });

    it('renders fallback description and dash when description or department are omitted', async () => {
      apiClient.get.mockImplementationOnce(() =>
        Promise.resolve({
          data: {
            success: true,
            data: {
              _id: 'kpi-minimal',
              name: 'Minimal KPI',
              code: 'MIN-KPI',
              department: null,
              target: 100,
              currentValue: 50,
              unit: '%',
              status: 'on_track',
              period: 'monthly',
              owner: '',
              description: '',
            },
          },
        })
      );

      renderDetailPage('kpi-minimal');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Minimal KPI', level: 2 })).toBeInTheDocument();
      });

      // Description falls back to "Code: MIN-KPI"
      expect(screen.getByText('Code: MIN-KPI')).toBeInTheDocument();
      // Department falls back to "—"
      expect(screen.getByText('—')).toBeInTheDocument();
      // Owner section omitted when empty
      expect(screen.queryByText('Owner')).not.toBeInTheDocument();
    });
  });

  describe('Higher-is-better vs Lower-is-better Rule Support', () => {
    it('prefills higher_is_better in edit modal for revenue KPI', async () => {
      const user = userEvent.setup();
      renderDetailPage('kpi-rev');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Quarterly Revenue', level: 2 })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /^edit$/i }));

      expect(screen.getByRole('heading', { name: /edit kpi/i, level: 2 })).toBeInTheDocument();
      const statusRuleSelect = screen.getByLabelText(/achievement rule/i);
      expect(statusRuleSelect).toHaveValue('higher_is_better');
    });

    it('prefills lower_is_better in edit modal and displays rule in Quick Value modal for latency KPI', async () => {
      const user = userEvent.setup();
      renderDetailPage('kpi-latency');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'P99 API Latency', level: 2 })).toBeInTheDocument();
      });

      // Check Quick Value rule display
      await user.click(screen.getByRole('button', { name: /update value/i }));
      const quickModal = screen.getByRole('dialog');
      expect(within(quickModal).getByText(/lower is better/i)).toBeInTheDocument();
      await user.click(within(quickModal).getByRole('button', { name: /cancel/i }));

      // Check Edit modal prefilled rule
      await user.click(screen.getByRole('button', { name: /^edit$/i }));
      expect(screen.getByRole('heading', { name: /edit kpi/i, level: 2 })).toBeInTheDocument();
      const statusRuleSelect = screen.getByLabelText(/achievement rule/i);
      expect(statusRuleSelect).toHaveValue('lower_is_better');
    });
  });

  describe('Quick Value Modal Workflow', () => {
    it('opens Quick Value modal, updates value and status, and refetches KPI', async () => {
      const user = userEvent.setup();
      renderDetailPage('kpi-rev');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Quarterly Revenue', level: 2 })).toBeInTheDocument();
      });

      const updateValueBtn = screen.getByRole('button', { name: /update value/i });
      await user.click(updateValueBtn);

      const modal = screen.getByRole('dialog');
      expect(within(modal).getByRole('heading', { name: /update kpi value/i })).toBeInTheDocument();
      expect(within(modal).getByText(/higher is better/i)).toBeInTheDocument();

      // Change current value
      const valueInput = within(modal).getByLabelText(/new current value/i);
      await user.clear(valueInput);
      await user.type(valueInput, '850000');

      // Change status to completed
      const statusSelect = within(modal).getByLabelText(/^status$/i);
      await user.selectOptions(statusSelect, 'completed');

      const submitBtn = within(modal).getByRole('button', { name: /^update value$/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(apiClient.patch).toHaveBeenCalledWith('/kpis/kpi-rev', {
          currentValue: 850000,
          status: 'completed',
        });
        expect(screen.getByText('KPI value updated to 850000')).toBeInTheDocument();
      });

      // Quick Value modal closes
      expect(screen.queryByRole('heading', { name: /update kpi value/i })).not.toBeInTheDocument();
      // Verifies refetch was called
      expect(apiClient.get).toHaveBeenCalledWith('/kpis/kpi-rev');
    });
  });

  describe('Edit KPI Modal Workflow', () => {
    it('opens Edit modal prefilled with existing data, submits changes, and displays success toast', async () => {
      const user = userEvent.setup();
      renderDetailPage('kpi-rev');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Quarterly Revenue', level: 2 })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /^edit$/i }));

      expect(screen.getByRole('heading', { name: /edit kpi/i, level: 2 })).toBeInTheDocument();

      // Verify fields are prefilled
      const nameInput = screen.getByLabelText(/^name/i);
      expect(nameInput).toHaveValue('Quarterly Revenue');
      const targetInput = screen.getByLabelText(/^target/i);
      expect(targetInput).toHaveValue(1000000);

      // Modify target
      await user.clear(targetInput);
      await user.type(targetInput, '1200000');

      const saveChangesBtn = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveChangesBtn);

      await waitFor(() => {
        expect(apiClient.patch).toHaveBeenCalledWith(
          '/kpis/kpi-rev',
          expect.objectContaining({
            name: 'Quarterly Revenue',
            target: 1200000,
          })
        );
        expect(screen.getByText('KPI "Quarterly Revenue" updated')).toBeInTheDocument();
      });

      // Modal closes
      expect(screen.queryByRole('heading', { name: /edit kpi/i, level: 2 })).not.toBeInTheDocument();
    });
  });

  describe('Delete Workflow', () => {
    it('cancels deletion when Cancel is clicked in ConfirmDialog', async () => {
      const user = userEvent.setup();
      renderDetailPage('kpi-rev');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Quarterly Revenue', level: 2 })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /^delete$/i }));

      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByText('Delete KPI?')).toBeInTheDocument();
      expect(
        within(dialog).getByText(/"Quarterly Revenue" will be permanently deleted\. This cannot be undone\./i)
      ).toBeInTheDocument();

      const cancelBtn = within(dialog).getByRole('button', { name: /cancel/i });
      await user.click(cancelBtn);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(apiClient.delete).not.toHaveBeenCalled();
    });

    it('deletes KPI on confirmation, displays toast, and navigates back to /kpis', async () => {
      const user = userEvent.setup();
      renderDetailPage('kpi-rev');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Quarterly Revenue', level: 2 })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /^delete$/i }));

      const dialog = screen.getByRole('dialog');
      const confirmDeleteBtn = within(dialog).getByRole('button', { name: 'Delete' });
      await user.click(confirmDeleteBtn);

      await waitFor(() => {
        expect(apiClient.delete).toHaveBeenCalledWith('/kpis/kpi-rev');
        expect(screen.getByText('KPI "Quarterly Revenue" deleted')).toBeInTheDocument();
        // Navigates to /kpis
        expect(screen.getByText('KPIs List Page')).toBeInTheDocument();
      });
    });
  });

  describe('Error States and 404 Handling', () => {
    it('displays error state when KPI fetch fails', async () => {
      apiClient.get.mockImplementationOnce(() =>
        Promise.reject(new Error('KPI not found'))
      );

      renderDetailPage('kpi-nonexistent');

      await waitFor(() => {
        expect(screen.getByText('KPI not found')).toBeInTheDocument();
      });

      expect(screen.queryByRole('heading', { name: 'Quarterly Revenue', level: 2 })).not.toBeInTheDocument();
    });
  });

  describe('Retry Behaviour', () => {
    it('retries fetching KPI on error and recovers upon success', async () => {
      const user = userEvent.setup();
      apiClient.get.mockImplementationOnce(() =>
        Promise.reject(new Error('Network error loading KPI'))
      );

      renderDetailPage('kpi-rev');

      await waitFor(() => {
        expect(screen.getByText('Network error loading KPI')).toBeInTheDocument();
      });

      const retryBtn = screen.getByRole('button', { name: /retry/i });
      await user.click(retryBtn);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Quarterly Revenue', level: 2 })).toBeInTheDocument();
      });
    });
  });

  describe('RBAC Action Visibility', () => {
    it('Admin sees Update Value, Edit, and Delete action buttons', async () => {
      renderDetailPage('kpi-rev', { user: mockAdminUser, isAdmin: true });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Quarterly Revenue', level: 2 })).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /update value/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^edit$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^delete$/i })).toBeInTheDocument();
    });

    it('Viewer sees metrics and status badge, but mutating buttons are hidden', async () => {
      renderDetailPage('kpi-rev', { user: mockViewerUser, isAdmin: false });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Quarterly Revenue', level: 2 })).toBeInTheDocument();
      });

      // Status badge and metrics visible
      expect(screen.getByText('On Track')).toBeInTheDocument();
      expect(screen.getByText('750,000 USD')).toBeInTheDocument();

      // Mutating buttons are hidden
      expect(screen.queryByRole('button', { name: /update value/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^edit$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^delete$/i })).not.toBeInTheDocument();
    });
  });
});
