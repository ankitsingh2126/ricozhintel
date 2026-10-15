// CSV export formatting and escaping unit tests.

import { describe, test, expect } from '@jest/globals';
import { escapeCsvCell, generateCsv, getExportFilename } from '../../client/src/utils/csvExport.js';

describe('CSV Export Utility', () => {
  describe('escapeCsvCell', () => {
    test('handles null, undefined and empty values', () => {
      expect(escapeCsvCell(null)).toBe('');
      expect(escapeCsvCell(undefined)).toBe('');
      expect(escapeCsvCell('')).toBe('');
    });

    test('returns plain strings and numbers as-is', () => {
      expect(escapeCsvCell('Monthly Revenue')).toBe('Monthly Revenue');
      expect(escapeCsvCell(50000)).toBe('50000');
    });

    test('escapes values containing commas', () => {
      expect(escapeCsvCell('Chen, Alice')).toBe('"Chen, Alice"');
    });

    test('escapes values containing double quotes by doubling them', () => {
      expect(escapeCsvCell('Hello "World"')).toBe('"Hello ""World"""');
    });

    test('escapes values containing newlines', () => {
      expect(escapeCsvCell("Line 1\nLine 2")).toBe("\"Line 1\nLine 2\"");
      expect(escapeCsvCell("Line 1\r\nLine 2")).toBe("\"Line 1\r\nLine 2\"");
    });
  });

  describe('generateCsv', () => {
    const columns = [
      { label: 'Name', key: 'name' },
      { label: 'Code', key: 'code' },
      { label: 'Department', key: (r) => r.department?.name || '—' },
      { label: 'Target', key: 'target' },
      { label: 'Achievement (%)', key: (r) => r.achievement != null ? `${r.achievement}%` : '—' },
    ];

    test('generates valid header row when rows array is empty', () => {
      const csv = generateCsv(columns, []);
      expect(csv).toBe('Name,Code,Department,Target,Achievement (%)');
    });

    test('generates proper data rows with formatted and extracted fields', () => {
      const rows = [
        {
          name: 'Revenue, Gross',
          code: 'SAL-REV',
          department: { name: 'Sales & Marketing' },
          target: 100000,
          achievement: 85,
        },
        {
          name: 'Bug Rate',
          code: 'ENG-BUG',
          department: null,
          target: 5,
          achievement: null,
        },
      ];

      const csv = generateCsv(columns, rows);
      const lines = csv.split('\r\n');

      expect(lines.length).toBe(3);
      expect(lines[0]).toBe('Name,Code,Department,Target,Achievement (%)');
      expect(lines[1]).toBe('"Revenue, Gross",SAL-REV,Sales & Marketing,100000,85%');
      expect(lines[2]).toBe('Bug Rate,ENG-BUG,—,5,—');
    });

    test('formats dashboard snapshot rows correctly', () => {
      const snapshotColumns = [
        { label: 'Department Name', key: (r) => r.department?.name || '—' },
        { label: 'Department Code', key: (r) => r.department?.code || '—' },
        { label: 'Total KPIs', key: 'total' },
        { label: 'On Track', key: (r) => r.byStatus?.on_track ?? 0 },
        { label: 'At Risk', key: (r) => r.byStatus?.at_risk ?? 0 },
        { label: 'Off Track', key: (r) => r.byStatus?.off_track ?? 0 },
        { label: 'Completed', key: (r) => r.byStatus?.completed ?? 0 },
        {
          label: 'Avg Achievement (%)',
          key: (r) => (r.avgAchievement != null ? `${r.avgAchievement}%` : '—'),
        },
      ];

      const snapshotRows = [
        {
          department: { name: 'Engineering', code: 'ENG' },
          total: 3,
          byStatus: { on_track: 2, at_risk: 1, off_track: 0, completed: 0 },
          avgAchievement: 92,
        },
        {
          department: { name: 'Finance', code: 'FIN' },
          total: 1,
          byStatus: { on_track: 0, at_risk: 0, off_track: 1, completed: 0 },
          avgAchievement: null,
        },
      ];

      const csv = generateCsv(snapshotColumns, snapshotRows);
      const lines = csv.split('\r\n');

      expect(lines.length).toBe(3);
      expect(lines[0]).toBe(
        'Department Name,Department Code,Total KPIs,On Track,At Risk,Off Track,Completed,Avg Achievement (%)'
      );
      expect(lines[1]).toBe('Engineering,ENG,3,2,1,0,0,92%');
      expect(lines[2]).toBe('Finance,FIN,1,0,0,1,0,—');
    });

    test('returns empty string if columns array is missing or empty', () => {
      expect(generateCsv([], [{ name: 'Test' }])).toBe('');
      expect(generateCsv(null, [{ name: 'Test' }])).toBe('');
    });
  });

  describe('getExportFilename', () => {
    test('produces timestamped filename format', () => {
      const filename = getExportFilename('kpis');
      expect(filename).toMatch(/^ricozhintel-kpis-\d{4}-\d{2}-\d{2}\.csv$/);

      const dashboardFilename = getExportFilename('dashboard-snapshot');
      expect(dashboardFilename).toMatch(/^ricozhintel-dashboard-snapshot-\d{4}-\d{2}-\d{2}\.csv$/);
    });
  });
});
