// Integration tests for User Navigation and Admin Route Protection.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import Sidebar from '../layouts/Sidebar.jsx';
import AppRoutes from '../routes/AppRoutes.jsx';
import { renderWithProviders, mockAdminUser, mockViewerUser } from './testUtils.jsx';

// Mock API client and services used by routes
vi.mock('../services/apiClient.js');
vi.mock('../services/departmentService.js', () => ({
  fetchDepartments: vi.fn().mockResolvedValue({ items: [], meta: { page: 1, pages: 1, total: 0 } }),
  fetchDepartmentById: vi.fn(),
}));
vi.mock('../services/kpiService.js', () => ({
  fetchKpis: vi.fn().mockResolvedValue({ items: [], meta: { page: 1, pages: 1, total: 0 } }),
  fetchKpiSummary: vi.fn().mockResolvedValue({ total: 0, byStatus: {}, avgProgress: 0 }),
  fetchKpiSummaryByDepartment: vi.fn().mockResolvedValue([]),
  fetchKpiHistory: vi.fn().mockResolvedValue({ items: [], meta: { page: 1, pages: 1, total: 0 } }),
}));
vi.mock('../services/userService.js', () => ({
  fetchUsers: vi.fn().mockResolvedValue({ items: [], meta: { page: 1, pages: 1, total: 0 } }),
  fetchUserById: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  updateUserRole: vi.fn(),
  updateUserStatus: vi.fn(),
}));

describe('User Navigation and Admin Route Protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Sidebar Navigation Entry', () => {
    it('renders Users navigation entry for Admin users', () => {
      renderWithProviders(<Sidebar isOpen={false} onClose={vi.fn()} />, {
        authState: { user: mockAdminUser, isAuthenticated: true, isAdmin: true },
      });

      const usersLink = screen.getByRole('link', { name: /users/i });
      expect(usersLink).toBeInTheDocument();
      expect(usersLink).toHaveAttribute('href', '/users');
    });

    it('does NOT render Users navigation entry for Viewer users', () => {
      renderWithProviders(<Sidebar isOpen={false} onClose={vi.fn()} />, {
        authState: { user: mockViewerUser, isAuthenticated: true, isAdmin: false },
      });

      const usersLink = screen.queryByRole('link', { name: /users/i });
      expect(usersLink).not.toBeInTheDocument();
    });
  });

  describe('Route Protection on /users', () => {
    it('allows Admin user to access /users and renders User Management page', async () => {
      renderWithProviders(<AppRoutes />, {
        route: '/users',
        authState: { user: mockAdminUser, isAuthenticated: true, isAdmin: true },
      });

      await waitFor(
        () => {
          expect(screen.getByRole('heading', { name: /user management/i })).toBeInTheDocument();
        },
        { timeout: 4000 }
      );
      expect(screen.getByText(/manage user accounts, roles, and administrative access permissions/i)).toBeInTheDocument();
    });

    it('redirects Viewer user away from /users to dashboard', async () => {
      renderWithProviders(<AppRoutes />, {
        route: '/users',
        authState: { user: mockViewerUser, isAuthenticated: true, isAdmin: false },
      });

      // Viewer should be redirected to dashboard
      await waitFor(
        () => {
          expect(screen.queryByText(/manage user accounts, roles, and administrative access permissions/i)).not.toBeInTheDocument();
        },
        { timeout: 4000 }
      );
    });

    it('redirects unauthenticated user away from /users to /login', async () => {
      renderWithProviders(<AppRoutes />, {
        route: '/users',
        authState: { user: null, isAuthenticated: false, isAdmin: false },
      });

      await waitFor(
        () => {
          expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
        },
        { timeout: 4000 }
      );
      expect(screen.queryByText(/administrative user directory/i)).not.toBeInTheDocument();
    });
  });
});
