// Tests for DashboardPage filters, reset controls, and CSV export utilities.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DashboardPage from '../pages/DashboardPage.jsx';
import { renderWithProviders, mockAdminUser } from './testUtils.jsx';
import * as departmentService from '../services/departmentService.js';
import * as kpiService from '../services/kpiService.js';
import {
  escapeCsvCell,
  generateCsv,
  getExportFilename,
  downloadCsv,
} from '../utils/csvExport.js';

vi.mock('../services/departmentService.js');
vi.mock('../services/kpiService.js');

describe('Dashboard Filtering & CSV Reporting', () => {
  const mockDept = { _id: 'dept-1', name: 'Engineering', code: 'ENG' };
  const mockSummaryData = {
    total: 3,
    byStatus: { on_track: 2, at_risk: 1, off_track: 0, completed: 0 },
    avgProgress: 75,
  };
  const mockDeptSummaryData = [
    {
      department: mockDept,
      total: 3,
      byStatus: { on_track: 2, at_risk: 1, off_track: 0, completed: 0 },
      avgAchievement: 85,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    departmentService.fetchDepartments.mockResolvedValue({
      items: [mockDept],
      meta: { page: 1, pages: 1, total: 1, limit: 100 },
    });

    kpiService.fetchKpiSummary.mockResolvedValue(mockSummaryData);
    kpiService.fetchKpis.mockResolvedValue({ items: [], meta: { total: 0 } });
    kpiService.fetchKpiSummaryByDepartment.mockResolvedValue(mockDeptSummaryData);
  });

  describe('DashboardPage Filtering & Snapshot Export', () => {
    it('renders dashboard KPI cards and department snapshot table', async () => {
      renderWithProviders(<DashboardPage />, {
        authState: { user: mockAdminUser, isAdmin: true },
      });

      await waitFor(() => {
        expect(screen.getByText('Executive Dashboard')).toBeInTheDocument();
      });

      expect(screen.getByText('Total KPIs')).toBeInTheDocument();
      expect(screen.getByText('Export Snapshot CSV')).toBeInTheDocument();
    });

    it('updates filters and displays Reset Filters button when active', async () => {
      const user = userEvent.setup();

      renderWithProviders(<DashboardPage />, {
        authState: { user: mockAdminUser, isAdmin: true },
      });

      await waitFor(() => {
        expect(screen.getByText('Executive Dashboard')).toBeInTheDocument();
      });

      // Initially no reset button
      expect(screen.queryByRole('button', { name: /^reset$/i })).not.toBeInTheDocument();

      // Change status filter
      const statusSelect = screen.getByDisplayValue('All statuses');
      await user.selectOptions(statusSelect, 'on_track');

      // Reset button should now be visible
      const resetBtn = await screen.findByRole('button', { name: /^reset$/i });
      expect(resetBtn).toBeInTheDocument();

      // Click Reset Filters
      await user.click(resetBtn);

      // Status should return to "All statuses" and Reset button disappear
      expect(screen.getByDisplayValue('All statuses')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^reset$/i })).not.toBeInTheDocument();
    });

    it('triggers snapshot CSV download when Export Snapshot CSV is clicked', async () => {
      const user = userEvent.setup();

      renderWithProviders(<DashboardPage />, {
        authState: { user: mockAdminUser, isAdmin: true },
      });

      await waitFor(() => {
        expect(screen.getByText('Export Snapshot CSV')).toBeInTheDocument();
      });

      const exportBtn = screen.getByRole('button', { name: /export snapshot csv/i });
      await user.click(exportBtn);

      // Verify URL.createObjectURL and revokeObjectURL were called
      expect(window.URL.createObjectURL).toHaveBeenCalled();
      expect(window.URL.revokeObjectURL).toHaveBeenCalled();
    });
  });

  describe('csvExport utility (RFC 4180 compliance)', () => {
    it('escapes plain values without quotes', () => {
      expect(escapeCsvCell('Engineering')).toBe('Engineering');
      expect(escapeCsvCell(100)).toBe('100');
      expect(escapeCsvCell(null)).toBe('');
      expect(escapeCsvCell(undefined)).toBe('');
    });

    it('wraps values containing commas in double quotes', () => {
      expect(escapeCsvCell('Sales, Marketing')).toBe('"Sales, Marketing"');
    });

    it('doubles embedded quotation marks', () => {
      expect(escapeCsvCell('Top "Priority" Task')).toBe('"Top ""Priority"" Task"');
    });

    it('wraps values containing newlines in quotes', () => {
      expect(escapeCsvCell("Line 1\nLine 2")).toBe('"Line 1\nLine 2"');
    });

    it('generates well-formed CSV with headers and row lines', () => {
      const columns = [
        { label: 'Name', key: 'name' },
        { label: 'Score', key: 'score' },
        { label: 'Calculated', key: (r) => `${r.score * 2}%` },
      ];
      const rows = [
        { name: 'Alice, Smith', score: 50 },
        { name: 'Bob "The Builder"', score: 90 },
      ];

      const csv = generateCsv(columns, rows);
      const lines = csv.split('\r\n');

      expect(lines[0]).toBe('Name,Score,Calculated');
      expect(lines[1]).toBe('"Alice, Smith",50,100%');
      expect(lines[2]).toBe('"Bob ""The Builder""",90,180%');
    });

    it('getExportFilename formats prefix with current date', () => {
      const today = new Date().toISOString().split('T')[0];
      expect(getExportFilename('kpis')).toBe(`ricozhintel-kpis-${today}.csv`);
      expect(getExportFilename('dashboard-snapshot')).toBe(`ricozhintel-dashboard-snapshot-${today}.csv`);
    });

    it('downloadCsv creates a downloadable anchor element and triggers click', () => {
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click');

      downloadCsv('test,csv,content', 'test-file.csv');

      expect(window.URL.createObjectURL).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
      expect(window.URL.revokeObjectURL).toHaveBeenCalled();
    });
  });
});
