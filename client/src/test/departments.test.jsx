// Tests for DepartmentsPage: status filter, search, combined filtering, and RBAC controls.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DepartmentsPage from '../pages/DepartmentsPage.jsx';
import { renderWithProviders, mockAdminUser, mockViewerUser } from './testUtils.jsx';
import * as departmentService from '../services/departmentService.js';

vi.mock('../services/departmentService.js');
vi.mock('../services/apiClient.js');

describe('DepartmentsPage - Filtering and Interaction', () => {
  const sampleDepartments = [
    {
      _id: 'dept-1',
      name: 'Engineering',
      code: 'ENG',
      head: 'Alice Engineer',
      description: 'Product tech stack',
      status: 'active',
    },
    {
      _id: 'dept-2',
      name: 'Marketing',
      code: 'MKT',
      head: 'Bob Marketer',
      description: 'Brand and growth',
      status: 'active',
    },
    {
      _id: 'dept-3',
      name: 'Legacy Operations',
      code: 'LEG-OPS',
      head: 'Charlie Retired',
      description: 'Deprecated operational unit',
      status: 'inactive',
    },
    {
      _id: 'dept-4',
      name: 'Human Resources',
      code: 'HR',
      head: 'Dana Recruiter',
      description: 'People and culture',
      status: 'inactive',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    departmentService.fetchDepartments.mockResolvedValue({
      items: sampleDepartments,
      meta: { page: 1, pages: 1, total: sampleDepartments.length, limit: 100 },
    });
  });

  it('renders search input and department status dropdown with expected options', async () => {
    renderWithProviders(<DepartmentsPage />, {
      authState: { user: mockAdminUser, isAdmin: true },
    });

    await waitFor(() => {
      expect(screen.getByText('Engineering')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search by name or code/i);
    expect(searchInput).toBeInTheDocument();

    const statusSelect = screen.getByRole('combobox', { name: /filter by department status/i });
    expect(statusSelect).toBeInTheDocument();

    const options = Array.from(statusSelect.querySelectorAll('option')).map((o) => ({
      value: o.value,
      label: o.textContent,
    }));

    expect(options).toEqual([
      { value: '', label: 'All statuses' },
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
    ]);
  });

  it('filters departments by status', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DepartmentsPage />, {
      authState: { user: mockAdminUser, isAdmin: true },
    });

    await waitFor(() => {
      expect(screen.getByText('Engineering')).toBeInTheDocument();
      expect(screen.getByText('Legacy Operations')).toBeInTheDocument();
    });

    const statusSelect = screen.getByRole('combobox', { name: /filter by department status/i });

    // Filter to Active
    await user.selectOptions(statusSelect, 'active');
    expect(screen.getByText('Engineering')).toBeInTheDocument();
    expect(screen.getByText('Marketing')).toBeInTheDocument();
    expect(screen.queryByText('Legacy Operations')).not.toBeInTheDocument();
    expect(screen.queryByText('Human Resources')).not.toBeInTheDocument();

    // Filter to Inactive
    await user.selectOptions(statusSelect, 'inactive');
    expect(screen.queryByText('Engineering')).not.toBeInTheDocument();
    expect(screen.queryByText('Marketing')).not.toBeInTheDocument();
    expect(screen.getByText('Legacy Operations')).toBeInTheDocument();
    expect(screen.getByText('Human Resources')).toBeInTheDocument();

    // Reset to All statuses
    await user.selectOptions(statusSelect, '');
    expect(screen.getByText('Engineering')).toBeInTheDocument();
    expect(screen.getByText('Legacy Operations')).toBeInTheDocument();
  });

  it('filters departments by search text (name or code)', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DepartmentsPage />, {
      authState: { user: mockAdminUser, isAdmin: true },
    });

    await waitFor(() => {
      expect(screen.getByText('Engineering')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search by name or code/i);

    // Search by name
    await user.type(searchInput, 'market');
    expect(screen.getByText('Marketing')).toBeInTheDocument();
    expect(screen.queryByText('Engineering')).not.toBeInTheDocument();
    expect(screen.queryByText('Legacy Operations')).not.toBeInTheDocument();

    // Clear search using clear button
    const clearBtn = screen.getByRole('button', { name: /clear search/i });
    await user.click(clearBtn);
    expect(searchInput).toHaveValue('');
    expect(screen.getByText('Engineering')).toBeInTheDocument();
    expect(screen.getByText('Marketing')).toBeInTheDocument();

    // Search by code
    await user.type(searchInput, 'ENG');
    expect(screen.getByText('Engineering')).toBeInTheDocument();
    expect(screen.queryByText('Marketing')).not.toBeInTheDocument();
  });

  it('combines search and status filters correctly', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DepartmentsPage />, {
      authState: { user: mockAdminUser, isAdmin: true },
    });

    await waitFor(() => {
      expect(screen.getByText('Engineering')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search by name or code/i);
    const statusSelect = screen.getByRole('combobox', { name: /filter by department status/i });

    // Select Inactive
    await user.selectOptions(statusSelect, 'inactive');
    expect(screen.getByText('Legacy Operations')).toBeInTheDocument();
    expect(screen.getByText('Human Resources')).toBeInTheDocument();

    // Search for "Operations" while status is Inactive
    await user.type(searchInput, 'Operations');
    expect(screen.getByText('Legacy Operations')).toBeInTheDocument();
    expect(screen.queryByText('Human Resources')).not.toBeInTheDocument();
    expect(screen.queryByText('Engineering')).not.toBeInTheDocument();
  });

  it('preserves search when status changes, and preserves status when search is cleared', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DepartmentsPage />, {
      authState: { user: mockAdminUser, isAdmin: true },
    });

    await waitFor(() => {
      expect(screen.getByText('Engineering')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search by name or code/i);
    const statusSelect = screen.getByRole('combobox', { name: /filter by department status/i });

    // Set search to "Operations"
    await user.type(searchInput, 'Operations');
    expect(searchInput).toHaveValue('Operations');

    // Change status to Inactive -> search value should remain "Operations"
    await user.selectOptions(statusSelect, 'inactive');
    expect(searchInput).toHaveValue('Operations');
    expect(statusSelect).toHaveValue('inactive');
    expect(screen.getByText('Legacy Operations')).toBeInTheDocument();

    // Clear search -> status value should remain "inactive"
    const clearBtn = screen.getByRole('button', { name: /clear search/i });
    await user.click(clearBtn);
    expect(searchInput).toHaveValue('');
    expect(statusSelect).toHaveValue('inactive');
    expect(screen.getByText('Legacy Operations')).toBeInTheDocument();
    expect(screen.getByText('Human Resources')).toBeInTheDocument();
  });

  it('shows empty state when no departments match the filters', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DepartmentsPage />, {
      authState: { user: mockAdminUser, isAdmin: true },
    });

    await waitFor(() => {
      expect(screen.getByText('Engineering')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search by name or code/i);
    await user.type(searchInput, 'NonExistentDepartment');

    expect(screen.getByText('No matching departments')).toBeInTheDocument();
    expect(screen.getByText(/No department matches “NonExistentDepartment”/i)).toBeInTheDocument();
  });

  it('resets pagination to page 1 when search or status filter changes', async () => {
    const user = userEvent.setup();
    // Create 8 departments so PAGE_SIZE (6) creates 2 pages
    const eightDepartments = Array.from({ length: 8 }, (_, i) => ({
      _id: `dept-${i + 1}`,
      name: `Dept ${i + 1}`,
      code: `D${i + 1}`,
      head: `Head ${i + 1}`,
      description: `Description ${i + 1}`,
      status: i < 7 ? 'active' : 'inactive',
    }));

    departmentService.fetchDepartments.mockResolvedValue({
      items: eightDepartments,
      meta: { page: 1, pages: 1, total: 8, limit: 100 },
    });

    renderWithProviders(<DepartmentsPage />, {
      authState: { user: mockAdminUser, isAdmin: true },
    });

    await waitFor(() => {
      expect(screen.getByText('Dept 1')).toBeInTheDocument();
    });

    // Go to page 2
    const nextBtn = screen.getByRole('button', { name: /next/i });
    await user.click(nextBtn);
    expect(screen.getByText('Dept 7')).toBeInTheDocument();
    expect(screen.queryByText('Dept 1')).not.toBeInTheDocument();

    // Change status filter -> resets to page 1
    const statusSelect = screen.getByRole('combobox', { name: /filter by department status/i });
    await user.selectOptions(statusSelect, 'active');
    expect(screen.getByText('Dept 1')).toBeInTheDocument();

    // Go to page 2 again
    await user.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText('Dept 7')).toBeInTheDocument();

    // Type in search -> resets to page 1
    const searchInput = screen.getByPlaceholderText(/search by name or code/i);
    await user.type(searchInput, 'Dept');
    expect(screen.getByText('Dept 1')).toBeInTheDocument();
  });

  it('allows Viewer to filter departments while keeping administrative actions hidden', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DepartmentsPage />, {
      authState: { user: mockViewerUser, isAdmin: false },
    });

    await waitFor(() => {
      expect(screen.getByText('Engineering')).toBeInTheDocument();
    });

    // Viewer should not see admin buttons
    expect(screen.queryByRole('button', { name: /add department/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^edit$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^delete$/i })).not.toBeInTheDocument();

    // Filter controls should be present and usable
    const statusSelect = screen.getByRole('combobox', { name: /filter by department status/i });
    await user.selectOptions(statusSelect, 'inactive');
    expect(screen.getByText('Legacy Operations')).toBeInTheDocument();
    expect(screen.queryByText('Engineering')).not.toBeInTheDocument();
  });
});
