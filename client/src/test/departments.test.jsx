// Tests for DepartmentsPage:
// - Status filter, search, combined filtering, pagination-reset, and Viewer read-only controls
// - Full CRUD workflows: Add Department, Edit Department, and ConfirmDialog Delete
// - Pagination step-back when deleting the last item on a page
// - API error handling for create, update, and delete
// - Empty, loading, and error / retry states

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DepartmentsPage from '../pages/DepartmentsPage.jsx';
import ToastContainer from '../components/common/ToastContainer.jsx';
import { renderWithProviders, mockAdminUser, mockViewerUser } from './testUtils.jsx';
import * as departmentService from '../services/departmentService.js';
import { apiClient } from '../services/apiClient.js';

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
    apiClient.post.mockResolvedValue({
      data: { success: true, data: { _id: 'dept-new', name: 'Product Design' } },
    });
    apiClient.patch.mockResolvedValue({
      data: { success: true, data: { _id: 'dept-1', name: 'Engineering' } },
    });
    apiClient.delete.mockResolvedValue({
      data: { success: true, message: 'Department deleted' },
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

describe('DepartmentsPage - CRUD Workflows', () => {
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
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    departmentService.fetchDepartments.mockResolvedValue({
      items: sampleDepartments,
      meta: { page: 1, pages: 1, total: sampleDepartments.length, limit: 100 },
    });
    apiClient.post.mockResolvedValue({
      data: { success: true, data: { _id: 'dept-new', name: 'Product Design' } },
    });
    apiClient.patch.mockResolvedValue({
      data: { success: true, data: { _id: 'dept-1', name: 'Engineering' } },
    });
    apiClient.delete.mockResolvedValue({
      data: { success: true, message: 'Department deleted' },
    });
  });

  function renderPage(authState = { user: mockAdminUser, isAdmin: true }) {
    return renderWithProviders(
      <>
        <DepartmentsPage />
        <ToastContainer />
      </>,
      { authState }
    );
  }

  describe('Add and Edit Workflows', () => {
    it('opens Add Department modal, submits valid data, receives success feedback, and refreshes list', async () => {
      const user = userEvent.setup();
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Engineering')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /add department/i }));
      expect(screen.getByRole('heading', { name: /add department/i, level: 2 })).toBeInTheDocument();

      await user.type(screen.getByLabelText(/^name/i), 'Product Design');
      await user.type(screen.getByLabelText(/^code/i), 'des');
      await user.type(screen.getByLabelText(/head of department/i), 'Diana Prince');
      await user.type(screen.getByLabelText(/description/i), 'User experience design');
      await user.selectOptions(screen.getByLabelText(/^status$/i), 'active');

      await user.click(screen.getByRole('button', { name: /create department/i }));

      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith('/departments', {
          name: 'Product Design',
          code: 'DES',
          head: 'Diana Prince',
          description: 'User experience design',
          status: 'active',
        });
        expect(screen.getByText('Department "Product Design" created')).toBeInTheDocument();
      });

      expect(screen.queryByRole('heading', { name: /add department/i, level: 2 })).not.toBeInTheDocument();
      expect(departmentService.fetchDepartments).toHaveBeenCalledTimes(2);
    });

    it('opens Edit Department modal with existing values prefilled, updates the department, and refreshes list', async () => {
      const user = userEvent.setup();
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Engineering')).toBeInTheDocument();
      });

      const card = screen.getByText('Engineering').closest('.rounded-lg');
      await user.click(within(card).getByRole('button', { name: /^edit$/i }));

      expect(screen.getByRole('heading', { name: /edit department/i, level: 2 })).toBeInTheDocument();
      expect(screen.getByLabelText(/^name/i)).toHaveValue('Engineering');
      expect(screen.getByLabelText(/^code/i)).toHaveValue('ENG');
      expect(screen.getByLabelText(/head of department/i)).toHaveValue('Alice Engineer');
      expect(screen.getByLabelText(/description/i)).toHaveValue('Product tech stack');
      expect(screen.getByLabelText(/^status$/i)).toHaveValue('active');

      const headInput = screen.getByLabelText(/head of department/i);
      await user.clear(headInput);
      await user.type(headInput, 'Alice Senior Director');

      await user.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(apiClient.patch).toHaveBeenCalledWith(
          '/departments/dept-1',
          expect.objectContaining({
            name: 'Engineering',
            code: 'ENG',
            head: 'Alice Senior Director',
          })
        );
        expect(screen.getByText('Department "Engineering" updated')).toBeInTheDocument();
      });

      expect(screen.queryByRole('heading', { name: /edit department/i, level: 2 })).not.toBeInTheDocument();
      expect(departmentService.fetchDepartments).toHaveBeenCalledTimes(2);
    });

    it('shows error feedback when Add Department API fails and preserves modal state', async () => {
      const user = userEvent.setup();
      apiClient.post.mockRejectedValueOnce({
        message: 'Department code must be unique',
      });
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Engineering')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /add department/i }));
      await user.type(screen.getByLabelText(/^name/i), 'Duplicate Dept');
      await user.type(screen.getByLabelText(/^code/i), 'eng');
      await user.click(screen.getByRole('button', { name: /create department/i }));

      await waitFor(() => {
        expect(screen.getByText('Department code must be unique')).toBeInTheDocument();
      });

      expect(screen.getByRole('heading', { name: /add department/i, level: 2 })).toBeInTheDocument();
    });

    it('shows error feedback when Edit Department API fails and preserves modal state', async () => {
      const user = userEvent.setup();
      apiClient.patch.mockRejectedValueOnce({
        message: 'Failed to update department',
      });
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Engineering')).toBeInTheDocument();
      });

      const card = screen.getByText('Engineering').closest('.rounded-lg');
      await user.click(within(card).getByRole('button', { name: /^edit$/i }));

      await user.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(screen.getByText('Failed to update department')).toBeInTheDocument();
      });

      expect(screen.getByRole('heading', { name: /edit department/i, level: 2 })).toBeInTheDocument();
    });
  });

  describe('Delete Workflow & Pagination Step-Back', () => {
    it('opens ConfirmDialog on delete click and cancels deletion without calling API', async () => {
      const user = userEvent.setup();
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Engineering')).toBeInTheDocument();
      });

      const card = screen.getByText('Engineering').closest('.rounded-lg');
      await user.click(within(card).getByRole('button', { name: /^delete$/i }));

      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByText('Delete department?')).toBeInTheDocument();
      expect(
        within(dialog).getByText(/"Engineering" will be permanently deleted\. This cannot be undone\./i)
      ).toBeInTheDocument();

      await user.click(within(dialog).getByRole('button', { name: /cancel/i }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(apiClient.delete).not.toHaveBeenCalled();
    });

    it('confirms deletion, calls delete API, displays success toast, and refreshes list', async () => {
      const user = userEvent.setup();
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Engineering')).toBeInTheDocument();
      });

      const card = screen.getByText('Engineering').closest('.rounded-lg');
      await user.click(within(card).getByRole('button', { name: /^delete$/i }));

      const dialog = screen.getByRole('dialog');
      await user.click(within(dialog).getByRole('button', { name: /^delete$/i }));

      await waitFor(() => {
        expect(apiClient.delete).toHaveBeenCalledWith('/departments/dept-1');
        expect(screen.getByText('Department "Engineering" deleted')).toBeInTheDocument();
      });

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(departmentService.fetchDepartments).toHaveBeenCalledTimes(2);
    });

    it('steps back pagination to previous page when deleting the last item on a page', async () => {
      const user = userEvent.setup();
      const sevenDepartments = Array.from({ length: 7 }, (_, i) => ({
        _id: `dept-${i + 1}`,
        name: `Dept ${i + 1}`,
        code: `D${i + 1}`,
        head: `Head ${i + 1}`,
        description: `Description ${i + 1}`,
        status: 'active',
      }));

      departmentService.fetchDepartments.mockResolvedValue({
        items: sevenDepartments,
        meta: { page: 1, pages: 1, total: 7, limit: 100 },
      });

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Dept 1')).toBeInTheDocument();
      });

      // Navigate to page 2 (contains only Dept 7)
      const nextBtn = screen.getByRole('button', { name: /next/i });
      await user.click(nextBtn);
      expect(screen.getByText('Dept 7')).toBeInTheDocument();

      // Mock remaining 6 items on refetch
      departmentService.fetchDepartments.mockResolvedValueOnce({
        items: sevenDepartments.slice(0, 6),
        meta: { page: 1, pages: 1, total: 6, limit: 100 },
      });

      const card = screen.getByText('Dept 7').closest('.rounded-lg');
      await user.click(within(card).getByRole('button', { name: /^delete$/i }));

      const dialog = screen.getByRole('dialog');
      await user.click(within(dialog).getByRole('button', { name: /^delete$/i }));

      await waitFor(() => {
        expect(apiClient.delete).toHaveBeenCalledWith('/departments/dept-7');
        expect(screen.getByText('Department "Dept 7" deleted')).toBeInTheDocument();
      });

      // Paginated departments stepped back to page 1, displaying Dept 1
      await waitFor(() => {
        expect(screen.getByText('Dept 1')).toBeInTheDocument();
      });
    });

    it('shows error feedback when delete API fails', async () => {
      const user = userEvent.setup();
      apiClient.delete.mockRejectedValueOnce({
        message: 'Cannot delete department with active KPIs',
      });
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Engineering')).toBeInTheDocument();
      });

      const card = screen.getByText('Engineering').closest('.rounded-lg');
      await user.click(within(card).getByRole('button', { name: /^delete$/i }));

      const dialog = screen.getByRole('dialog');
      await user.click(within(dialog).getByRole('button', { name: /^delete$/i }));

      await waitFor(() => {
        expect(screen.getByText('Cannot delete department with active KPIs')).toBeInTheDocument();
      });
    });
  });

  describe('Loading, Empty, and Error / Retry States', () => {
    it('renders empty state when no departments exist at all', async () => {
      departmentService.fetchDepartments.mockResolvedValueOnce({
        items: [],
        meta: { page: 1, pages: 1, total: 0, limit: 100 },
      });

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('No departments yet')).toBeInTheDocument();
      });
      expect(
        screen.getByText(/click “add department” above to create the first one/i)
      ).toBeInTheDocument();
    });

    it('displays error state when fetching departments fails and retries upon clicking Retry', async () => {
      const user = userEvent.setup();
      departmentService.fetchDepartments.mockRejectedValueOnce(
        new Error('Failed to load departments')
      );

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Failed to load departments')).toBeInTheDocument();
      });

      departmentService.fetchDepartments.mockResolvedValueOnce({
        items: sampleDepartments,
        meta: { page: 1, pages: 1, total: sampleDepartments.length, limit: 100 },
      });

      const retryBtn = screen.getByRole('button', { name: /retry/i });
      await user.click(retryBtn);

      await waitFor(() => {
        expect(screen.getByText('Engineering')).toBeInTheDocument();
      });
    });
  });
});
