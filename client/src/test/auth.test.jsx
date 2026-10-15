// Tests for authentication UI: LoginPage, Header user session & logout, and ProtectedRoute.

import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import LoginPage from '../pages/LoginPage.jsx';
import Header from '../layouts/Header.jsx';
import ProtectedRoute from '../components/common/ProtectedRoute.jsx';
import { renderWithProviders, mockAdminUser, mockViewerUser } from './testUtils.jsx';

describe('Authentication UI & Session', () => {
  describe('LoginPage', () => {
    it('renders email, password inputs, submit button, and demo sign-in options', () => {
      renderWithProviders(<LoginPage />);

      expect(screen.getByText(/sign in to ricozhintel/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/name@company.com/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/••••••••/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /demo admin/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /demo viewer/i })).toBeInTheDocument();
    });

    it('toggles password visibility when eye icon button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LoginPage />);

      const passwordInput = screen.getByPlaceholderText(/••••••••/i);
      expect(passwordInput).toHaveAttribute('type', 'password');

      const toggleBtn = screen.getByRole('button', { name: /show password/i });
      await user.click(toggleBtn);
      expect(passwordInput).toHaveAttribute('type', 'text');

      const hideBtn = screen.getByRole('button', { name: /hide password/i });
      await user.click(hideBtn);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('calls login with email and password on form submission', async () => {
      const user = userEvent.setup();
      const mockLogin = vi.fn().mockResolvedValue(mockAdminUser);

      renderWithProviders(<LoginPage />, {
        authState: { login: mockLogin },
      });

      await user.type(screen.getByPlaceholderText(/name@company.com/i), 'test@example.com');
      await user.type(screen.getByPlaceholderText(/••••••••/i), 'Secret123!');
      await user.click(screen.getByRole('button', { name: /^sign in$/i }));

      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'Secret123!',
      });
    });

    it('quick-fills and submits admin demo credentials when Demo Admin is clicked', async () => {
      const user = userEvent.setup();
      const mockLogin = vi.fn().mockResolvedValue(mockAdminUser);

      renderWithProviders(<LoginPage />, {
        authState: { login: mockLogin },
      });

      await user.click(screen.getByRole('button', { name: /demo admin/i }));

      expect(mockLogin).toHaveBeenCalledWith({
        email: 'admin@ricozhintel.internal',
        password: 'Admin123!',
      });
    });

    it('quick-fills and submits viewer demo credentials when Demo Viewer is clicked', async () => {
      const user = userEvent.setup();
      const mockLogin = vi.fn().mockResolvedValue(mockViewerUser);

      renderWithProviders(<LoginPage />, {
        authState: { login: mockLogin },
      });

      await user.click(screen.getByRole('button', { name: /demo viewer/i }));

      expect(mockLogin).toHaveBeenCalledWith({
        email: 'viewer@ricozhintel.internal',
        password: 'Viewer123!',
      });
    });

    it('displays error message when login fails', async () => {
      const user = userEvent.setup();
      const mockLogin = vi.fn().mockRejectedValue(new Error('Invalid email or password'));

      renderWithProviders(<LoginPage />, {
        authState: { login: mockLogin },
      });

      await user.type(screen.getByPlaceholderText(/name@company.com/i), 'wrong@example.com');
      await user.type(screen.getByPlaceholderText(/••••••••/i), 'WrongPass');
      await user.click(screen.getByRole('button', { name: /^sign in$/i }));

      await waitFor(() => {
        expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
      });
    });
  });

  describe('Header component', () => {
    it('displays user name and Admin role badge for admin users', () => {
      renderWithProviders(<Header title="Dashboard" />, {
        authState: { user: mockAdminUser, isAdmin: true },
      });

      expect(screen.getByText('Admin User')).toBeInTheDocument();
      expect(screen.getByText('admin@ricozhintel.internal')).toBeInTheDocument();
      expect(screen.getByText('Admin')).toBeInTheDocument();
    });

    it('displays user name and Viewer role badge for viewer users', () => {
      renderWithProviders(<Header title="Dashboard" />, {
        authState: { user: mockViewerUser, isAdmin: false },
      });

      expect(screen.getByText('Executive Viewer')).toBeInTheDocument();
      expect(screen.getByText('viewer@ricozhintel.internal')).toBeInTheDocument();
      expect(screen.getByText('Viewer')).toBeInTheDocument();
    });

    it('triggers logout when Logout button is clicked', async () => {
      const user = userEvent.setup();
      const mockLogout = vi.fn();

      renderWithProviders(<Header title="Dashboard" />, {
        authState: { user: mockAdminUser, logout: mockLogout },
      });

      const logoutBtn = screen.getByRole('button', { name: /log out/i });
      await user.click(logoutBtn);

      expect(mockLogout).toHaveBeenCalledTimes(1);
    });
  });

  describe('ProtectedRoute guard', () => {
    it('displays loader when session loading is true', () => {
      renderWithProviders(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>,
        { authState: { loading: true } }
      );

      expect(screen.getByText(/verifying session/i)).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('redirects to /login when unauthenticated', () => {
      renderWithProviders(
        <Routes>
          <Route path="/login" element={<div>Login Screen</div>} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div>Protected Dashboard</div>
              </ProtectedRoute>
            }
          />
        </Routes>,
        {
          route: '/dashboard',
          authState: { isAuthenticated: false, loading: false, user: null },
        }
      );

      expect(screen.getByText('Login Screen')).toBeInTheDocument();
      expect(screen.queryByText('Protected Dashboard')).not.toBeInTheDocument();
    });

    it('renders protected child component when authenticated', () => {
      renderWithProviders(
        <ProtectedRoute>
          <div>Protected Dashboard</div>
        </ProtectedRoute>,
        {
          authState: { isAuthenticated: true, loading: false, user: mockAdminUser },
        }
      );

      expect(screen.getByText('Protected Dashboard')).toBeInTheDocument();
    });
  });
});
