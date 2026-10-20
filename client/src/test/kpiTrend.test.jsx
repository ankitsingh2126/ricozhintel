import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import KpiDetailPage from '../pages/KpiDetailPage.jsx';
import KpiTrendChart from '../components/charts/KpiTrendChart.jsx';
import { transformTrendData } from '../utils/trendUtils.js';
import ToastContainer from '../components/common/ToastContainer.jsx';
import { renderWithProviders, mockAdminUser, mockViewerUser } from './testUtils.jsx';
import * as departmentService from '../services/departmentService.js';
import { apiClient } from '../services/apiClient.js';

vi.mock('../services/departmentService.js');
vi.mock('../services/apiClient.js');

describe('KPI Trend Analytics & Visualization Tests', () => {
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

  const rawHistoryItems = [
    {
      _id: 'hist-2',
      kpi: 'kpi-rev',
      previousValue: 500000,
      newValue: 750000,
      target: 1000000,
      status: 'on_track',
      changeType: 'value_update',
      note: 'Added enterprise contract',
      changedByName: 'Admin User',
      createdAt: '2026-03-10T10:00:00.000Z',
    },
    {
      _id: 'hist-1',
      kpi: 'kpi-rev',
      previousValue: 0,
      newValue: 500000,
      target: 1000000,
      status: 'behind',
      changeType: 'initial',
      note: 'Initial baseline setup',
      changedByName: 'Admin User',
      createdAt: '2026-01-05T08:00:00.000Z',
    },
    {
      _id: 'hist-3',
      kpi: 'kpi-rev',
      previousValue: 750000,
      newValue: 820000,
      target: 1000000,
      status: 'on_track',
      changeType: 'value_update',
      note: 'End of quarter true-up',
      changedByName: 'Admin User',
      createdAt: '2026-03-25T16:00:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    departmentService.fetchDepartments.mockResolvedValue({
      items: [sampleDepartment],
      meta: { page: 1, pages: 1, total: 1, limit: 100 },
    });
  });

  describe('transformTrendData Helper', () => {
    it('returns empty array when items is empty, null, or undefined', () => {
      expect(transformTrendData([])).toEqual([]);
      expect(transformTrendData(null)).toEqual([]);
      expect(transformTrendData(undefined)).toEqual([]);
    });

    it('sorts out-of-order history records chronologically (oldest first)', () => {
      const transformed = transformTrendData(rawHistoryItems, 1000000);

      expect(transformed).toHaveLength(3);
      // First chronological point must be Jan 5
      expect(transformed[0].id).toBe('hist-1');
      expect(transformed[0].value).toBe(500000);

      // Second point must be Mar 10
      expect(transformed[1].id).toBe('hist-2');
      expect(transformed[1].value).toBe(750000);

      // Third point must be Mar 25
      expect(transformed[2].id).toBe('hist-3');
      expect(transformed[2].value).toBe(820000);
    });

    it('correctly flags baseline records and maps metadata', () => {
      const transformed = transformTrendData(rawHistoryItems, 1000000);

      expect(transformed[0].isBaseline).toBe(true);
      expect(transformed[0].changeTypeLabel).toBe('Initial Baseline');
      expect(transformed[0].note).toBe('Initial baseline setup');

      expect(transformed[1].isBaseline).toBe(false);
      expect(transformed[1].changeTypeLabel).toBe('Value Update');
      expect(transformed[1].note).toBe('Added enterprise contract');
    });

    it('preserves target reference value and supports fallbackTarget', () => {
      const itemWithoutTarget = [
        {
          _id: 'hist-x',
          kpi: 'kpi-rev',
          previousValue: 0,
          newValue: 100,
          target: null,
          status: 'on_track',
          changeType: 'initial',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ];

      const transformed = transformTrendData(itemWithoutTarget, 500);
      expect(transformed[0].target).toBe(500);
    });
  });

  describe('KpiTrendChart Component', () => {
    it('renders chart header, legends, and target annotation when data is present', () => {
      renderWithProviders(
        <KpiTrendChart
          items={rawHistoryItems}
          target={1000000}
          unit="USD"
          loading={false}
          error={null}
        />
      );

      expect(
        screen.getByText('Performance Trend & Target Tracking')
      ).toBeInTheDocument();
      expect(screen.getByText('Actual Value')).toBeInTheDocument();
      expect(screen.getByText('Target (1,000,000 USD)')).toBeInTheDocument();
      expect(screen.getByText('Baseline')).toBeInTheDocument();
    });

    it('renders empty state when there are zero history records', () => {
      renderWithProviders(
        <KpiTrendChart
          items={[]}
          target={1000000}
          unit="USD"
          loading={false}
          error={null}
        />
      );

      expect(
        screen.getByText('No historical data available to plot trend.')
      ).toBeInTheDocument();
      expect(
        screen.getByText(/historical value changes and baseline measurements will appear here chronologically/i)
      ).toBeInTheDocument();
    });

    it('handles single historical record gracefully with informative notice', () => {
      const singleItem = [rawHistoryItems[1]]; // Jan 5 initial baseline (500000)

      renderWithProviders(
        <KpiTrendChart
          items={singleItem}
          target={1000000}
          unit="USD"
          loading={false}
          error={null}
        />
      );

      expect(
        screen.getByText(/initial baseline recorded at 500,000 USD/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/historical trajectory line will extend/i)
      ).toBeInTheDocument();
    });

    it('renders loading state when loading is true', () => {
      renderWithProviders(
        <KpiTrendChart
          items={[]}
          target={1000000}
          unit="USD"
          loading={true}
          error={null}
        />
      );

      expect(screen.getByText('Loading trend data…')).toBeInTheDocument();
    });

    it('renders error state and triggers onRetry', async () => {
      const user = userEvent.setup();
      const handleRetry = vi.fn();

      renderWithProviders(
        <KpiTrendChart
          items={[]}
          target={1000000}
          unit="USD"
          loading={false}
          error={{ message: 'Network failed to fetch trend' }}
          onRetry={handleRetry}
        />
      );

      expect(screen.getByText('Network failed to fetch trend')).toBeInTheDocument();

      const retryBtn = screen.getByRole('button', { name: /retry/i });
      await user.click(retryBtn);

      expect(handleRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('KpiDetailPage Trend Integration', () => {
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

    it('loads and renders both trend chart and history timeline on detail page', async () => {
      apiClient.get.mockImplementation((url, config) => {
        if (url.includes('/history')) {
          // Both trend (limit 100) and timeline (limit 10) call this endpoint
          return Promise.resolve({
            data: {
              success: true,
              data: rawHistoryItems,
              meta: { page: 1, limit: config?.params?.limit || 10, total: 3, pages: 1 },
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

      // Trend Chart is rendered
      await waitFor(() => {
        expect(screen.getByText('Performance Trend & Target Tracking')).toBeInTheDocument();
      });
      expect(screen.getByText('Target (1,000,000 USD)')).toBeInTheDocument();

      // History Timeline is also rendered alongside the chart
      expect(screen.getByText('Value History & Change Log')).toBeInTheDocument();
      expect(screen.getByText('Initial Baseline')).toBeInTheDocument();
    });

    it('Viewer role can view both trend chart and timeline, but mutation controls are hidden', async () => {
      apiClient.get.mockImplementation((url, config) => {
        if (url.includes('/history')) {
          return Promise.resolve({
            data: {
              success: true,
              data: rawHistoryItems,
              meta: { page: 1, limit: config?.params?.limit || 10, total: 3, pages: 1 },
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

      // Trend chart is visible to Viewer
      await waitFor(() => {
        expect(screen.getByText('Performance Trend & Target Tracking')).toBeInTheDocument();
      });

      // Timeline is visible to Viewer
      expect(screen.getByText('Value History & Change Log')).toBeInTheDocument();

      // Mutation buttons hidden for Viewer
      expect(screen.queryByRole('button', { name: /update value/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^edit$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^delete$/i })).not.toBeInTheDocument();
    });
  });
});
