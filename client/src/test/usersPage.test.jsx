// Integration tests for UsersPage:
// - List rendering, search, filters, and pagination
// - Create User modal workflow and validation
// - Edit User profile modal workflow
// - Role toggle workflow, ConfirmDialog, and self-demotion protection
// - Status toggle workflow, ConfirmDialog, and self-deactivation protection
// - Last active admin backend error toast handling
// - Empty and error states with retry

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UsersPage from '../pages/UsersPage.jsx';
import { renderWithProviders, mockAdminUser } from './testUtils.jsx';
import { userService } from '../services/userService.js';

vi.mock('../services/userService.js');

describe('UsersPage Integration Tests', () => {
  const sampleUsers = [
    {
      _id: 'admin-user-id-123',
      name: 'Admin User',
      email: 'admin@ricozhintel.internal',
      role: 'admin',
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      _id: 'user-2',
      name: 'Bob Viewer',
      email: 'bob@test.internal',
      role: 'viewer',
      status: 'active',
      createdAt: '2026-02-01T00:00:00.000Z',
    },
    {
      _id: 'user-3',
      name: 'Charlie Inactive',
      email: 'charlie@test.internal',
      role: 'viewer',
      status: 'inactive',
      createdAt: '2026-03-01T00:00:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    userService.fetchUsers.mockResolvedValue({
      items: sampleUsers,
      meta: { page: 1, limit: 10, total: 3, pages: 1 },
    });
  });

  describe('List Rendering & Metadata', () => {
    it('renders page header, Add User button, and users directory table', async () => {
      renderWithProviders(<UsersPage />, {
        authState: { user: mockAdminUser, isAuthenticated: true, isAdmin: true },
      });

      expect(screen.getByRole('heading', { level: 2, name: /user management/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add user/i })).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Bob Viewer')).toBeInTheDocument();
      });

      expect(screen.getByText('admin@ricozhintel.internal')).toBeInTheDocument();
      expect(screen.getByText('Charlie Inactive')).toBeInTheDocument();

      // Verify (You) tag next to current user
      expect(screen.getByText('You')).toBeInTheDocument();
    });

    it('renders empty state when no users are returned', async () => {
      userService.fetchUsers.mockResolvedValue({
        items: [],
        meta: { page: 1, limit: 10, total: 0, pages: 1 },
      });

      renderWithProviders(<UsersPage />, {
        authState: { user: mockAdminUser, isAuthenticated: true, isAdmin: true },
      });

      await waitFor(() => {
        expect(screen.getByText(/no users found/i)).toBeInTheDocument();
      });
    });

    it('renders error state and permits retrying on fetch failure', async () => {
      userService.fetchUsers.mockRejectedValueOnce(new Error('Network error loading users'));

      renderWithProviders(<UsersPage />, {
        authState: { user: mockAdminUser, isAuthenticated: true, isAdmin: true },
      });

      await waitFor(() => {
        expect(screen.getByText(/network error loading users/i)).toBeInTheDocument();
      });

      // Click retry
      const retryBtn = screen.getByRole('button', { name: /retry/i });
      userService.fetchUsers.mockResolvedValueOnce({
        items: sampleUsers,
        meta: { page: 1, limit: 10, total: 3, pages: 1 },
      });

      await userEvent.click(retryBtn);

      await waitFor(() => {
        expect(screen.getByText('Bob Viewer')).toBeInTheDocument();
      });
    });
  });

  describe('Search, Filtering & Pagination', () => {
    it('searches users by text query', async () => {
      renderWithProviders(<UsersPage />, {
        authState: { user: mockAdminUser, isAuthenticated: true, isAdmin: true },
      });

      await waitFor(() => {
        expect(screen.getByText('Bob Viewer')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search by name or email/i);
      await userEvent.type(searchInput, 'bob');

      await waitFor(() => {
        expect(userService.fetchUsers).toHaveBeenCalledWith(
          expect.objectContaining({ search: 'bob', page: 1 })
        );
      });
    });

    it('filters users by role and status dropdowns and resets filters', async () => {
      renderWithProviders(<UsersPage />, {
        authState: { user: mockAdminUser, isAuthenticated: true, isAdmin: true },
      });

      await waitFor(() => {
        expect(screen.getByText('Bob Viewer')).toBeInTheDocument();
      });

      // Filter by role
      const roleSelect = screen.getByLabelText(/filter by role/i);
      await userEvent.selectOptions(roleSelect, 'admin');

      await waitFor(() => {
        expect(userService.fetchUsers).toHaveBeenCalledWith(
          expect.objectContaining({ role: 'admin', page: 1 })
        );
      });

      // Reset button appears
      const resetBtn = screen.getByRole('button', { name: /reset/i });
      expect(resetBtn).toBeInTheDocument();

      await userEvent.click(resetBtn);

      await waitFor(() => {
        expect(userService.fetchUsers).toHaveBeenCalledWith(
          expect.objectContaining({ search: undefined, role: undefined, status: undefined })
        );
      });
    });

    it('navigates pagination pages', async () => {
      userService.fetchUsers.mockResolvedValue({
        items: sampleUsers,
        meta: { page: 1, limit: 10, total: 25, pages: 3 },
      });

      renderWithProviders(<UsersPage />, {
        authState: { user: mockAdminUser, isAuthenticated: true, isAdmin: true },
      });

      await waitFor(() => {
        expect(screen.getByText(/showing 1–10 of 25/i)).toBeInTheDocument();
      });

      const nextBtn = screen.getByRole('button', { name: /next/i });
      await userEvent.click(nextBtn);

      await waitFor(() => {
        expect(userService.fetchUsers).toHaveBeenCalledWith(
          expect.objectContaining({ page: 2 })
        );
      });
    });
  });

  describe('User Creation Workflow', () => {
    it('validates fields and creates a new user successfully', async () => {
      userService.createUser.mockResolvedValue({
        _id: 'u-new',
        name: 'New Admin Member',
        email: 'new.admin@test.internal',
        role: 'admin',
        status: 'active',
      });

      renderWithProviders(<UsersPage />, {
        authState: { user: mockAdminUser, isAuthenticated: true, isAdmin: true },
      });

      await waitFor(() => {
        expect(screen.getByText('Bob Viewer')).toBeInTheDocument();
      });

      // Open Add User modal
      await userEvent.click(screen.getByRole('button', { name: /add user/i }));

      expect(screen.getByRole('heading', { name: /create new user/i })).toBeInTheDocument();

      // Fill in form fields
      await userEvent.type(screen.getByLabelText(/full name/i), 'New Admin Member');
      await userEvent.type(screen.getByLabelText(/email address/i), 'new.admin@test.internal');
      await userEvent.type(screen.getByLabelText(/initial password/i), 'Password123!');
      await userEvent.selectOptions(screen.getByLabelText(/^role$/i), 'admin');

      // Submit
      await userEvent.click(screen.getByRole('button', { name: /^create user$/i }));

      await waitFor(() => {
        expect(userService.createUser).toHaveBeenCalledWith({
          name: 'New Admin Member',
          email: 'new.admin@test.internal',
          password: 'Password123!',
          role: 'admin',
          status: 'active',
        });
      });

      // Refetches list
      expect(userService.fetchUsers).toHaveBeenCalledTimes(2);
    });

    it('displays client validation errors when required fields are missing or invalid', async () => {
      renderWithProviders(<UsersPage />, {
        authState: { user: mockAdminUser, isAuthenticated: true, isAdmin: true },
      });

      await waitFor(() => {
        expect(screen.getByText('Bob Viewer')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByRole('button', { name: /add user/i }));

      // Submit empty form
      await userEvent.click(screen.getByRole('button', { name: /^create user$/i }));

      expect(screen.getByText(/name must be at least 2 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/email address is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument();

      expect(userService.createUser).not.toHaveBeenCalled();
    });
  });

  describe('User Profile Edit Workflow', () => {
    it('opens edit modal prefilled with user data and submits updates', async () => {
      userService.updateUser.mockResolvedValue({
        _id: 'user-2',
        name: 'Bob Updated',
        email: 'bob.updated@test.internal',
        role: 'viewer',
        status: 'active',
      });

      renderWithProviders(<UsersPage />, {
        authState: { user: mockAdminUser, isAuthenticated: true, isAdmin: true },
      });

      await waitFor(() => {
        expect(screen.getByText('Bob Viewer')).toBeInTheDocument();
      });

      // Click Edit button for Bob Viewer
      const editButton = screen.getByRole('button', { name: /edit profile for bob viewer/i });
      await userEvent.click(editButton);

      expect(screen.getByRole('heading', { name: /edit user profile/i })).toBeInTheDocument();

      const nameInput = screen.getByLabelText(/full name/i);
      expect(nameInput).toHaveValue('Bob Viewer');

      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'Bob Updated');

      await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(userService.updateUser).toHaveBeenCalledWith('user-2', {
          name: 'Bob Updated',
          email: 'bob@test.internal',
        });
      });
    });
  });

  describe('Role Modification Workflow & Safeguards', () => {
    it('promotes a viewer to admin after confirming in dialog', async () => {
      userService.updateUserRole.mockResolvedValue({
        _id: 'user-2',
        name: 'Bob Viewer',
        role: 'admin',
        status: 'active',
      });

      renderWithProviders(<UsersPage />, {
        authState: { user: mockAdminUser, isAuthenticated: true, isAdmin: true },
      });

      await waitFor(() => {
        expect(screen.getByText('Bob Viewer')).toBeInTheDocument();
      });

      // Click promote button
      const promoteBtn = screen.getByRole('button', { name: /promote bob viewer to admin/i });
      await userEvent.click(promoteBtn);

      // Confirm dialog appears
      expect(screen.getByRole('heading', { name: /promote bob viewer\?/i })).toBeInTheDocument();
      expect(screen.getByText(/granted full administrative permissions/i)).toBeInTheDocument();

      const confirmBtn = screen.getByRole('button', { name: /promote to admin/i });
      await userEvent.click(confirmBtn);

      await waitFor(() => {
        expect(userService.updateUserRole).toHaveBeenCalledWith('user-2', 'admin');
      });
    });

    it('disables self-demotion button for the currently logged-in administrator', async () => {
      renderWithProviders(<UsersPage />, {
        authState: { user: mockAdminUser, isAuthenticated: true, isAdmin: true },
      });

      await waitFor(() => {
        expect(screen.getByText('admin@ricozhintel.internal')).toBeInTheDocument();
      });

      const selfRoleBtn = screen.getByRole('button', { name: /you cannot demote your own account/i });
      expect(selfRoleBtn).toBeDisabled();
    });

    it('safely handles backend rejection when demoting the last active admin', async () => {
      const secondAdmin = {
        _id: 'admin-2',
        name: 'Second Admin',
        email: 'admin2@test.internal',
        role: 'admin',
        status: 'active',
        createdAt: '2026-01-01T00:00:00.000Z',
      };

      userService.fetchUsers.mockResolvedValue({
        items: [sampleUsers[0], secondAdmin],
        meta: { page: 1, limit: 10, total: 2, pages: 1 },
      });

      const lastAdminError = new Error('Cannot demote the last remaining active administrator');
      lastAdminError.status = 400;
      userService.updateUserRole.mockRejectedValue(lastAdminError);

      renderWithProviders(<UsersPage />, {
        authState: { user: mockAdminUser, isAuthenticated: true, isAdmin: true },
      });

      await waitFor(() => {
        expect(screen.getByText('Second Admin')).toBeInTheDocument();
      });

      const demoteBtn = screen.getByRole('button', { name: /demote second admin to viewer/i });
      await userEvent.click(demoteBtn);

      const confirmBtn = screen.getByRole('button', { name: /demote to viewer/i });
      await userEvent.click(confirmBtn);

      await waitFor(() => {
        expect(userService.updateUserRole).toHaveBeenCalledWith('admin-2', 'viewer');
      });

      // Dialog does not crash and UI remains resilient
      expect(screen.getAllByText(/second admin/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Status Modification Workflow & Safeguards', () => {
    it('deactivates an active user after confirming in dialog', async () => {
      userService.updateUserStatus.mockResolvedValue({
        _id: 'user-2',
        name: 'Bob Viewer',
        role: 'viewer',
        status: 'inactive',
      });

      renderWithProviders(<UsersPage />, {
        authState: { user: mockAdminUser, isAuthenticated: true, isAdmin: true },
      });

      await waitFor(() => {
        expect(screen.getByText('Bob Viewer')).toBeInTheDocument();
      });

      const deactBtn = screen.getByRole('button', { name: /deactivate bob viewer's account/i });
      await userEvent.click(deactBtn);

      expect(screen.getByRole('heading', { name: /deactivate bob viewer's account\?/i })).toBeInTheDocument();

      const confirmBtn = screen.getByRole('button', { name: /deactivate account/i });
      await userEvent.click(confirmBtn);

      await waitFor(() => {
        expect(userService.updateUserStatus).toHaveBeenCalledWith('user-2', 'inactive');
      });
    });

    it('activates an inactive user after confirming in dialog', async () => {
      userService.updateUserStatus.mockResolvedValue({
        _id: 'user-3',
        name: 'Charlie Inactive',
        role: 'viewer',
        status: 'active',
      });

      renderWithProviders(<UsersPage />, {
        authState: { user: mockAdminUser, isAuthenticated: true, isAdmin: true },
      });

      await waitFor(() => {
        expect(screen.getByText('Charlie Inactive')).toBeInTheDocument();
      });

      const actBtn = screen.getByRole('button', { name: /activate charlie inactive's account/i });
      await userEvent.click(actBtn);

      expect(screen.getByRole('heading', { name: /activate charlie inactive's account\?/i })).toBeInTheDocument();

      const confirmBtn = screen.getByRole('button', { name: /activate account/i });
      await userEvent.click(confirmBtn);

      await waitFor(() => {
        expect(userService.updateUserStatus).toHaveBeenCalledWith('user-3', 'active');
      });
    });

    it('disables self-deactivation button for the currently logged-in user', async () => {
      renderWithProviders(<UsersPage />, {
        authState: { user: mockAdminUser, isAuthenticated: true, isAdmin: true },
      });

      await waitFor(() => {
        expect(screen.getByText('admin@ricozhintel.internal')).toBeInTheDocument();
      });

      const selfStatusBtn = screen.getByRole('button', { name: /you cannot deactivate your own account/i });
      expect(selfStatusBtn).toBeDisabled();
    });
  });
});
