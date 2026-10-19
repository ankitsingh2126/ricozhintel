// Test utilities: custom renderer with Router, ToastProvider, and AuthContext.

import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { AuthContext } from '../context/useAuth.js';
import { ToastProvider } from '../context/ToastContext.jsx';

export const mockAdminUser = {
  _id: 'admin-user-id-123',
  name: 'Admin User',
  email: 'admin@ricozhintel.internal',
  role: 'admin',
};

export const mockViewerUser = {
  _id: 'viewer-user-id-456',
  name: 'Executive Viewer',
  email: 'viewer@ricozhintel.internal',
  role: 'viewer',
};

export function renderWithProviders(ui, { authState = {}, route = '/', ...renderOptions } = {}) {
  const user = authState.user !== undefined ? authState.user : null;
  const token = authState.token !== undefined ? authState.token : user ? 'mock-token-xyz' : null;

  const defaultAuthValue = {
    user,
    token,
    loading: authState.loading ?? false,
    isAuthenticated: authState.isAuthenticated ?? Boolean(token && user),
    isAdmin: authState.isAdmin ?? (user?.role === 'admin'),
    login: authState.login || vi.fn().mockResolvedValue(user),
    register: authState.register || vi.fn().mockResolvedValue(user),
    logout: authState.logout || vi.fn(),
    ...authState,
  };

  function Wrapper({ children }) {
    return (
      <MemoryRouter initialEntries={[route]}>
        <ToastProvider>
          <AuthContext.Provider value={defaultAuthValue}>
            {children}
          </AuthContext.Provider>
        </ToastProvider>
      </MemoryRouter>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    authValue: defaultAuthValue,
  };
}
