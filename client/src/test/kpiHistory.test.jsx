import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import KpiDetailPage from '../pages/KpiDetailPage.jsx';
import KpiHistoryTimeline from '../components/kpis/KpiHistoryTimeline.jsx';
import ToastContainer from '../components/common/ToastContainer.jsx';
import { renderWithProviders, mockAdminUser, mockViewerUser } from './testUtils.jsx';
import * as kpiService from '../services/kpiService.js';
import * as departmentService from '../services/departmentService.js';
import { apiClient } from '../services/apiClient.js';

vi.mock('../services/departmentService.js');
vi.mock('../services/apiClient.js');

describe('KPI History & Timeline Tests', () => {
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

  const sampleHistoryItems = [
    {
      _id: 'hist-1',
      kpi: 'kpi-rev',
      previousValue: 600000,
      newValue: 750000,
      target: 1000000,
      status: 'on_track',
      changeType: 'value_update',
      note: 'Closed enterprise contract with Alpha Corp',
      changedByName: 'Admin User',
      createdAt: '2026-03-15T14:30:00.000Z',
    },
    {
      _id: 'hist-2',
      kpi: 'kpi-rev',
      previousValue: 0,
      newValue: 600000,
      target: 1000000,
      status: 'off_track',
      changeType: 'initial',
      note: '',
      changedByName: 'Admin User',
      createdAt: '2026-01-10T09:00:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    departmentService.fetchDepartments.mockResolvedValue({
      items: [sampleDepartment],
      meta: { page: 1, pages: 1, total: 1, limit: 100 },
    });
  });

  describe('kpiService.fetchKpiHistory', () => {
    it('calls GET /kpis/:id/history with pagination parameters and returns envelope items and meta', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: sampleHistoryItems,
          meta: { page: 2, limit: 5, total: 12, pages: 3 },
        },
      };
      apiClient.get.mockResolvedValueOnce(mockResponse);

      const result = await kpiService.fetchKpiHistory('kpi-rev', { page: 2, limit: 5 });

      expect(apiClient.get).toHaveBeenCalledWith('/kpis/kpi-rev/history', {
        params: { page: 2, limit: 5 },
      });
      expect(result.items).toHaveLength(2);
      expect(result.meta.page).toBe(2);
      expect(result.meta.total).toBe(12);
    });
  });

  describe('KpiHistoryTimeline Component', () => {
    it('renders history entries with change type, values, target, badge, author, and note', () => {
      renderWithProviders(
        <KpiHistoryTimeline
          items={sampleHistoryItems}
          meta={{ page: 1, pages: 1, total: 2, limit: 10 }}
          loading={false}
          error={null}
          unit="USD"
        />
      );

      expect(screen.getByText('Value History & Change Log')).toBeInTheDocument();
      expect(screen.getByText('2 entries recorded')).toBeInTheDocument();

      // Check change type labels
      expect(screen.getByText('Value Update')).toBeInTheDocument();
      expect(screen.getByText('Initial Baseline')).toBeInTheDocument();

      // Check author
      expect(screen.getAllByText('Admin User')).toHaveLength(2);

      // Check values and target
      expect(screen.getAllByText(/600,000/)).toHaveLength(2);
      expect(screen.getByText(/750,000/)).toBeInTheDocument();
      expect(screen.getAllByText(/1,000,000/)).toHaveLength(2);

      // Check note
      expect(screen.getByText('Closed enterprise contract with Alpha Corp')).toBeInTheDocument();
    });

    it('renders empty state when there are no history records', () => {
      renderWithProviders(
        <KpiHistoryTimeline
          items={[]}
          meta={{ page: 1, pages: 1, total: 0, limit: 10 }}
          loading={false}
          error={null}
          unit="USD"
        />
      );

      expect(
        screen.getByText('No historical updates recorded for this KPI yet.')
      ).toBeInTheDocument();
      expect(
        screen.getByText(/changes to current value will be logged automatically here/i)
      ).toBeInTheDocument();
    });

    it('renders error state and invokes retry callback', async () => {
      const user = userEvent.setup();
      const handleRetry = vi.fn();

      renderWithProviders(
        <KpiHistoryTimeline
          items={[]}
          meta={{ page: 1, pages: 1, total: 0, limit: 10 }}
          loading={false}
          error={{ message: 'Failed to load history records' }}
          onRetry={handleRetry}
          unit="USD"
        />
      );

      expect(screen.getByText('Failed to load history records')).toBeInTheDocument();

      const retryBtn = screen.getByRole('button', { name: /retry/i });
      await user.click(retryBtn);

      expect(handleRetry).toHaveBeenCalledTimes(1);
    });

    it('handles pagination navigation and invokes onPageChange', async () => {
      const user = userEvent.setup();
      const handlePageChange = vi.fn();

      renderWithProviders(
        <KpiHistoryTimeline
          items={sampleHistoryItems}
          meta={{ page: 1, pages: 3, total: 25, limit: 10 }}
          loading={false}
          error={null}
          onPageChange={handlePageChange}
          unit="USD"
        />
      );

      expect(screen.getByText(/showing 1–10 of 25/i)).toBeInTheDocument();

      const prevBtn = screen.getByRole('button', { name: /^prev$/i });
      const nextBtn = screen.getByRole('button', { name: /^next$/i });

      expect(prevBtn).toBeDisabled();
      expect(nextBtn).not.toBeDisabled();

      await user.click(nextBtn);
      expect(handlePageChange).toHaveBeenCalledWith(2);
    });
  });

  describe('KpiDetailPage History Integration', () => {
    function renderDetailPage(kpiId = 'kpi-rev', authState = { user: mockAdminUser, isAdmin: true }) {
      return renderWithProviders(
        <>
          <Routes>
            <Route path="/kpis/:id" element={<KpiDetailPage />} />
          </Routes>
          <ToastContainer />
        </>,
        {
          route: `/kpis/${kpiId}`,
          authState,
        }
      );
    }

    it('fetches and displays KPI history on the detail page', async () => {
      apiClient.get.mockImplementation((url) => {
        if (url.includes('/history')) {
          return Promise.resolve({
            data: {
              success: true,
              data: sampleHistoryItems,
              meta: { page: 1, limit: 10, total: 2, pages: 1 },
            },
          });
        }
        if (url.includes('/kpis/')) {
          return Promise.resolve({
            data: { success: true, data: sampleKpi },
          });
        }
        return Promise.resolve({ data: { success: true, data: {} } });
      });

      renderDetailPage('kpi-rev');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Quarterly Revenue', level: 2 })).toBeInTheDocument();
      });

      // Verify history rendered
      await waitFor(() => {
        expect(screen.getByText('Value History & Change Log')).toBeInTheDocument();
      });

      expect(screen.getByText('Value Update')).toBeInTheDocument();
      expect(screen.getByText('Closed enterprise contract with Alpha Corp')).toBeInTheDocument();
      expect(screen.getAllByText(/600,000/)).toHaveLength(2);
    });

    it('submits Quick Value update with note and triggers history refetch', async () => {
      const user = userEvent.setup();

      apiClient.get.mockImplementation((url) => {
        if (url.includes('/history')) {
          return Promise.resolve({
            data: {
              success: true,
              data: sampleHistoryItems,
              meta: { page: 1, limit: 10, total: 2, pages: 1 },
            },
          });
        }
        if (url.includes('/kpis/')) {
          return Promise.resolve({
            data: { success: true, data: sampleKpi },
          });
        }
        return Promise.resolve({ data: { success: true, data: {} } });
      });

      apiClient.patch.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            ...sampleKpi,
            currentValue: 800000,
          },
        },
      });

      renderDetailPage('kpi-rev');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Quarterly Revenue', level: 2 })).toBeInTheDocument();
      });

      const updateValueBtn = screen.getByRole('button', { name: /update value/i });
      await user.click(updateValueBtn);

      expect(screen.getByText(/update kpi value: quarterly revenue/i)).toBeInTheDocument();

      const modal = screen.getByRole('dialog');
      const noteInput = within(modal).getByLabelText(/change note \(optional\)/i);
      await user.type(noteInput, 'Final march towards Q1 finish line');

      const submitBtn = within(modal).getByRole('button', { name: /update value/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(apiClient.patch).toHaveBeenCalledWith(
          '/kpis/kpi-rev',
          expect.objectContaining({
            note: 'Final march towards Q1 finish line',
          })
        );
      });
    });

    it('Viewer can view history timeline but cannot edit or open Quick Value modal', async () => {
      apiClient.get.mockImplementation((url) => {
        if (url.includes('/history')) {
          return Promise.resolve({
            data: {
              success: true,
              data: sampleHistoryItems,
              meta: { page: 1, limit: 10, total: 2, pages: 1 },
            },
          });
        }
        if (url.includes('/kpis/')) {
          return Promise.resolve({
            data: { success: true, data: sampleKpi },
          });
        }
        return Promise.resolve({ data: { success: true, data: {} } });
      });

      renderDetailPage('kpi-rev', { user: mockViewerUser, isAdmin: false });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Quarterly Revenue', level: 2 })).toBeInTheDocument();
      });

      // History is visible
      await waitFor(() => {
        expect(screen.getByText('Value History & Change Log')).toBeInTheDocument();
      });
      expect(screen.getByText('Value Update')).toBeInTheDocument();
      expect(screen.getByText('Closed enterprise contract with Alpha Corp')).toBeInTheDocument();

      // Action buttons are hidden
      expect(screen.queryByRole('button', { name: /update value/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^edit$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^delete$/i })).not.toBeInTheDocument();
    });
  });
});
