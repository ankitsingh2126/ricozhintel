// Tests for KpisPage: searching, status/period filtering, pagination, CSV export,
// Quick Value modal updates, in-page CRUD, ConfirmDialog delete, and error handling.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import KpisPage from '../pages/KpisPage.jsx';
import ToastContainer from '../components/common/ToastContainer.jsx';
import { renderWithProviders, mockAdminUser } from './testUtils.jsx';
import * as kpiService from '../services/kpiService.js';
import * as departmentService from '../services/departmentService.js';
import { apiClient } from '../services/apiClient.js';

vi.mock('../services/kpiService.js');
vi.mock('../services/departmentService.js');
vi.mock('../services/apiClient.js');

describe('KpisPage Integration & Workflow Tests', () => {
  const sampleDepartment1 = {
    _id: 'dept-1',
    name: 'Sales',
    code: 'SAL',
  };

  const sampleDepartment2 = {
    _id: 'dept-2',
    name: 'Engineering',
    code: 'ENG',
  };

  const sampleKpi1 = {
    _id: 'kpi-1',
    name: 'Monthly Revenue',
    code: 'SAL-REV',
    department: sampleDepartment1,
    target: 500000,
    currentValue: 420000,
    achievement: 84,
    unit: 'USD',
    status: 'on_track',
    period: 'monthly',
    owner: 'Alice Chen',
    statusRule: 'higher_is_better',
  };

  const sampleKpi2 = {
    _id: 'kpi-2',
    name: 'Bug Escape Rate',
    code: 'ENG-BUGS',
    department: sampleDepartment2,
    target: 2,
    currentValue: 3.5,
    achievement: 57,
    unit: '%',
    status: 'off_track',
    period: 'quarterly',
    owner: 'Bob Patel',
    statusRule: 'lower_is_better',
  };


  beforeEach(() => {
    vi.clearAllMocks();

    departmentService.fetchDepartments.mockResolvedValue({
      items: [sampleDepartment1, sampleDepartment2],
      meta: { page: 1, pages: 1, total: 2, limit: 100 },
    });

    kpiService.fetchKpis.mockResolvedValue({
      items: [sampleKpi1, sampleKpi2],
      meta: { page: 1, pages: 1, total: 2, limit: 10 },
    });

    apiClient.post.mockResolvedValue({ data: { success: true } });
    apiClient.patch.mockResolvedValue({ data: { success: true } });
    apiClient.delete.mockResolvedValue({ data: { success: true } });
  });

  const renderKpisPage = (options = {}) => {
    return renderWithProviders(
      <>
        <ToastContainer />
        <KpisPage />
      </>,
      {
        authState: { user: mockAdminUser, isAdmin: true },
        ...options,
      }
    );
  };

  describe('Search and Filter Workflows', () => {
    it('searches KPIs by name or code and requests filtered results', async () => {
      const user = userEvent.setup();
      renderKpisPage();

      await waitFor(() => {
        expect(screen.getByText('Monthly Revenue')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search by name or code/i);
      await user.type(searchInput, 'Revenue');

      await waitFor(() => {
        expect(kpiService.fetchKpis).toHaveBeenCalledWith(
          expect.objectContaining({
            search: 'Revenue',
            page: 1,
            limit: 10,
          })
        );
      });
    });

    it('filters KPIs by status', async () => {
      const user = userEvent.setup();
      renderKpisPage();

      await waitFor(() => {
        expect(screen.getByText('Monthly Revenue')).toBeInTheDocument();
      });

      const statusSelect = screen.getByDisplayValue('All statuses');
      await user.selectOptions(statusSelect, 'at_risk');

      await waitFor(() => {
        expect(kpiService.fetchKpis).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'at_risk',
            page: 1,
          })
        );
      });

      // Reset to All statuses
      await user.selectOptions(statusSelect, '');
      await waitFor(() => {
        expect(kpiService.fetchKpis).toHaveBeenCalledWith(
          expect.objectContaining({
            status: undefined,
            page: 1,
          })
        );
      });
    });

    it('filters KPIs by period', async () => {
      const user = userEvent.setup();
      renderKpisPage();

      await waitFor(() => {
        expect(screen.getByText('Monthly Revenue')).toBeInTheDocument();
      });

      const periodSelect = screen.getByDisplayValue('All periods');
      await user.selectOptions(periodSelect, 'quarterly');

      await waitFor(() => {
        expect(kpiService.fetchKpis).toHaveBeenCalledWith(
          expect.objectContaining({
            period: 'quarterly',
            page: 1,
          })
        );
      });
    });

    it('combines search, status, and period filters simultaneously and resets page', async () => {
      const user = userEvent.setup();
      // Mock 2 pages so we can navigate to page 2 first
      kpiService.fetchKpis.mockResolvedValueOnce({
        items: [sampleKpi1],
        meta: { page: 1, pages: 2, total: 15, limit: 10 },
      });

      renderKpisPage();

      await waitFor(() => {
        expect(screen.getByText('Monthly Revenue')).toBeInTheDocument();
      });

      // Navigate to page 2
      const nextBtn = screen.getByRole('button', { name: /next/i });
      kpiService.fetchKpis.mockResolvedValueOnce({
        items: [sampleKpi2],
        meta: { page: 2, pages: 2, total: 15, limit: 10 },
      });
      await user.click(nextBtn);

      await waitFor(() => {
        expect(kpiService.fetchKpis).toHaveBeenCalledWith(
          expect.objectContaining({ page: 2 })
        );
      });

      // Changing search resets page to 1
      const searchInput = screen.getByPlaceholderText(/search by name or code/i);
      await user.type(searchInput, 'Bug');

      await waitFor(() => {
        expect(kpiService.fetchKpis).toHaveBeenCalledWith(
          expect.objectContaining({
            search: 'Bug',
            page: 1,
          })
        );
      });

      // Setting status and period preserves search and maintains page 1
      const statusSelect = screen.getByDisplayValue('All statuses');
      await user.selectOptions(statusSelect, 'off_track');

      const periodSelect = screen.getByDisplayValue('All periods');
      await user.selectOptions(periodSelect, 'quarterly');

      await waitFor(() => {
        expect(kpiService.fetchKpis).toHaveBeenCalledWith(
          expect.objectContaining({
            search: 'Bug',
            status: 'off_track',
            period: 'quarterly',
            page: 1,
          })
        );
      });
    });
  });

  describe('Pagination Behaviour', () => {
    it('renders pagination and enforces disabled boundary buttons on page 1 and last page', async () => {
      const user = userEvent.setup();
      kpiService.fetchKpis.mockResolvedValueOnce({
        items: [sampleKpi1],
        meta: { page: 1, pages: 2, total: 12, limit: 10 },
      });

      renderKpisPage();

      await waitFor(() => {
        expect(screen.getByText('Monthly Revenue')).toBeInTheDocument();
      });

      const prevBtn = screen.getByRole('button', { name: /prev/i });
      const nextBtn = screen.getByRole('button', { name: /next/i });

      // Prev is disabled on page 1
      expect(prevBtn).toBeDisabled();
      expect(nextBtn).toBeEnabled();

      // Navigate to page 2
      kpiService.fetchKpis.mockResolvedValueOnce({
        items: [sampleKpi2],
        meta: { page: 2, pages: 2, total: 12, limit: 10 },
      });
      await user.click(nextBtn);

      await waitFor(() => {
        expect(kpiService.fetchKpis).toHaveBeenCalledWith(
          expect.objectContaining({ page: 2 })
        );
      });

      // On last page (page 2 of 2), Next is disabled and Prev is enabled
      expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /prev/i })).toBeEnabled();
    });
  });

  describe('Empty Results Display', () => {
    it('displays empty state when no KPIs match search or filter query', async () => {
      kpiService.fetchKpis.mockResolvedValueOnce({
        items: [],
        meta: { page: 1, pages: 0, total: 0, limit: 10 },
      });

      renderKpisPage();

      await waitFor(() => {
        expect(screen.getByText('No KPIs found')).toBeInTheDocument();
      });

      expect(
        screen.getByText('Try a different filter, or create a new KPI.')
      ).toBeInTheDocument();
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });
  });

  describe('CSV Export Workflow', () => {
    it('fetches all filtered KPIs and triggers CSV download with success toast', async () => {
      const user = userEvent.setup();
      kpiService.fetchKpis.mockImplementation((params) => {
        if (params?.limit === 1000) {
          return Promise.resolve({
            items: [sampleKpi1, sampleKpi2],
            meta: { total: 2 },
          });
        }
        return Promise.resolve({
          items: [sampleKpi1, sampleKpi2],
          meta: { page: 1, pages: 1, total: 2, limit: 10 },
        });
      });

      renderKpisPage();

      await waitFor(() => {
        expect(screen.getByText('Monthly Revenue')).toBeInTheDocument();
      });

      const exportBtn = screen.getByRole('button', { name: /export csv/i });
      await user.click(exportBtn);

      await waitFor(() => {
        expect(kpiService.fetchKpis).toHaveBeenCalledWith(
          expect.objectContaining({ limit: 1000, page: 1 })
        );
        expect(window.URL.createObjectURL).toHaveBeenCalled();
        expect(screen.getByText(/Exported 2 KPI\(s\) to/i)).toBeInTheDocument();
      });
    });

    it('shows error toast when export returns zero records and avoids download', async () => {
      const user = userEvent.setup();
      kpiService.fetchKpis.mockImplementation((params) => {
        if (params?.limit === 1000) {
          return Promise.resolve({
            items: [],
            meta: { total: 0 },
          });
        }
        return Promise.resolve({
          items: [sampleKpi1],
          meta: { page: 1, pages: 1, total: 1, limit: 10 },
        });
      });

      renderKpisPage();

      await waitFor(() => {
        expect(screen.getByText('Monthly Revenue')).toBeInTheDocument();
      });

      window.URL.createObjectURL.mockClear();
      const exportBtn = screen.getByRole('button', { name: /export csv/i });
      await user.click(exportBtn);

      await waitFor(() => {
        expect(
          screen.getByText('No KPIs to export for the selected filters.')
        ).toBeInTheDocument();
      });

      expect(window.URL.createObjectURL).not.toHaveBeenCalled();
    });
  });

  describe('Quick Value Modal Workflow', () => {
    it('opens Quick Value modal from row, submits update, and refetches list', async () => {
      const user = userEvent.setup();
      renderKpisPage();

      await waitFor(() => {
        expect(screen.getByText('Monthly Revenue')).toBeInTheDocument();
      });

      // Find the "Value" button on the Monthly Revenue row
      const row = screen.getByText('Monthly Revenue').closest('tr');
      const valueBtn = within(row).getByRole('button', { name: /value/i });
      await user.click(valueBtn);

      // Modal opens
      expect(
        screen.getByText('Update KPI Value: Monthly Revenue')
      ).toBeInTheDocument();
      const valueInput = screen.getByLabelText(/current value/i);
      expect(valueInput).toHaveValue(420000);

      // Edit value and change status
      await user.clear(valueInput);
      await user.type(valueInput, '450000');
      const statusSelect = screen.getByLabelText(/status/i);
      await user.selectOptions(statusSelect, 'at_risk');

      // Submit
      const submitBtn = screen.getByRole('button', { name: /update value/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(apiClient.patch).toHaveBeenCalledWith('/kpis/kpi-1', {
          currentValue: 450000,
          status: 'at_risk',
        });
        expect(
          screen.getByText('KPI "Monthly Revenue" value updated')
        ).toBeInTheDocument();
      });

      // Dialog closed
      expect(
        screen.queryByText('Update KPI Value: Monthly Revenue')
      ).not.toBeInTheDocument();
    });
  });

  describe('Delete Workflow', () => {
    it('cancels deletion when Cancel button is clicked in ConfirmDialog', async () => {
      const user = userEvent.setup();
      renderKpisPage();

      await waitFor(() => {
        expect(screen.getByText('Monthly Revenue')).toBeInTheDocument();
      });

      const row = screen.getByText('Monthly Revenue').closest('tr');
      const deleteBtn = within(row).getByRole('button', { name: /delete/i });
      await user.click(deleteBtn);

      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByText('Delete KPI?')).toBeInTheDocument();

      const cancelBtn = within(dialog).getByRole('button', { name: /cancel/i });
      await user.click(cancelBtn);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(apiClient.delete).not.toHaveBeenCalled();
    });

    it('deletes KPI on confirmation, displays success toast, and steps back page if deleting last item', async () => {
      const user = userEvent.setup();
      // Mock page 2 with 1 item
      kpiService.fetchKpis.mockResolvedValue({
        items: [sampleKpi2],
        meta: { page: 2, pages: 2, total: 11, limit: 10 },
      });

      renderKpisPage();

      await waitFor(() => {
        expect(screen.getByText('Bug Escape Rate')).toBeInTheDocument();
      });

      const row = screen.getByText('Bug Escape Rate').closest('tr');
      const deleteBtn = within(row).getByRole('button', { name: /delete/i });
      await user.click(deleteBtn);

      const dialog = screen.getByRole('dialog');
      const confirmBtn = within(dialog).getByRole('button', { name: /^delete$/i });
      await user.click(confirmBtn);

      await waitFor(() => {
        expect(apiClient.delete).toHaveBeenCalledWith('/kpis/kpi-2');
        expect(
          screen.getByText('KPI "Bug Escape Rate" deleted')
        ).toBeInTheDocument();
      });

      // Verify page decremented to 1
      await waitFor(() => {
        expect(kpiService.fetchKpis).toHaveBeenCalledWith(
          expect.objectContaining({ page: 1 })
        );
      });
    });
  });

  describe('Add and Edit KPI Modal Workflows', () => {
    it('opens Add KPI modal, submits new KPI payload, and displays success toast', async () => {
      const user = userEvent.setup();
      renderKpisPage();

      await waitFor(() => {
        expect(screen.getByText('Monthly Revenue')).toBeInTheDocument();
      });

      const addBtn = screen.getByRole('button', { name: /add kpi/i });
      await user.click(addBtn);

      expect(screen.getByRole('heading', { name: /add kpi/i, level: 2 })).toBeInTheDocument();

      // Fill in required fields
      await user.type(screen.getByLabelText(/^name/i), 'Customer Retention');
      await user.type(screen.getByLabelText(/^code/i), 'cs-ret');
      await user.selectOptions(screen.getByLabelText(/department/i), 'dept-1');
      await user.type(screen.getByLabelText(/^target/i), '95');

      const submitBtn = screen.getByRole('button', { name: /create kpi/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith(
          '/kpis',
          expect.objectContaining({
            name: 'Customer Retention',
            code: 'CS-RET',
            department: 'dept-1',
            target: 95,
          })
        );
        expect(
          screen.getByText('KPI "Customer Retention" created')
        ).toBeInTheDocument();
      });

      expect(screen.queryByRole('heading', { name: /add kpi/i, level: 2 })).not.toBeInTheDocument();
    });

    it('opens Edit KPI modal with prefilled data, submits updates, and displays success toast', async () => {
      const user = userEvent.setup();
      renderKpisPage();

      await waitFor(() => {
        expect(screen.getByText('Monthly Revenue')).toBeInTheDocument();
      });

      const row = screen.getByText('Monthly Revenue').closest('tr');
      const editBtn = within(row).getByRole('button', { name: /^edit$/i });
      await user.click(editBtn);

      expect(screen.getByRole('heading', { name: /edit kpi/i, level: 2 })).toBeInTheDocument();
      const targetInput = screen.getByLabelText(/^target/i);
      expect(targetInput).toHaveValue(500000);

      // Modify target
      await user.clear(targetInput);
      await user.type(targetInput, '600000');

      const saveBtn = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveBtn);

      await waitFor(() => {
        expect(apiClient.patch).toHaveBeenCalledWith(
          '/kpis/kpi-1',
          expect.objectContaining({
            name: 'Monthly Revenue',
            target: 600000,
          })
        );
        expect(
          screen.getByText('KPI "Monthly Revenue" updated')
        ).toBeInTheDocument();
      });

      expect(screen.queryByRole('heading', { name: /edit kpi/i, level: 2 })).not.toBeInTheDocument();
    });
  });

  describe('API Error Handling and Retry', () => {
    it('displays error state when loading KPIs fails and retries upon clicking Retry', async () => {
      const user = userEvent.setup();
      kpiService.fetchKpis.mockRejectedValueOnce(
        new Error('Network error loading KPIs')
      );

      renderKpisPage();

      await waitFor(() => {
        expect(
          screen.getByText('Network error loading KPIs')
        ).toBeInTheDocument();
      });

      const retryBtn = screen.getByRole('button', { name: /retry/i });
      expect(retryBtn).toBeInTheDocument();

      // Mock success on retry
      kpiService.fetchKpis.mockResolvedValueOnce({
        items: [sampleKpi1],
        meta: { page: 1, pages: 1, total: 1, limit: 10 },
      });

      await user.click(retryBtn);

      await waitFor(() => {
        expect(screen.getByText('Monthly Revenue')).toBeInTheDocument();
      });

      expect(
        screen.queryByText('Network error loading KPIs')
      ).not.toBeInTheDocument();
    });
  });
});
