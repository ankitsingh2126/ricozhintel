// Authentication API service for register, login, and fetching current session profile.

import { apiClient } from './apiClient.js';

export const authService = {
  // POST /auth/login
  login: async ({ email, password }) => {
    const res = await apiClient.post('/auth/login', { email, password });
    return res.data.data;
  },

  // POST /auth/register
  register: async ({ name, email, password, role }) => {
    const res = await apiClient.post('/auth/register', { name, email, password, role });
    return res.data.data;
  },

  // GET /auth/me
  getMe: async () => {
    const res = await apiClient.get('/auth/me');
    return res.data.data;
  },
};
