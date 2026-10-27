// User management API calls for administrative operations.

import { apiClient } from './apiClient.js';

/**
 * Fetch a paginated list of users with optional search and filters.
 * @param {Object} params - { search, role, status, page, limit }
 * @returns {Promise<{ items: Array, meta: Object }>}
 */
export const fetchUsers = async (params = {}) => {
  const res = await apiClient.get('/users', { params });
  return { items: res.data.data, meta: res.data.meta };
};

/**
 * Fetch a single user by ID.
 * @param {string} id - User ID
 * @returns {Promise<Object>} user
 */
export const fetchUserById = async (id) => {
  const res = await apiClient.get(`/users/${id}`);
  return res.data.data;
};

/**
 * Create a new user (admin only).
 * @param {Object} userData - { name, email, password, role, status }
 * @returns {Promise<Object>} created user
 */
export const createUser = async (userData) => {
  const res = await apiClient.post('/users', userData);
  return res.data.data;
};

/**
 * Update user profile details (name, email).
 * @param {string} id - User ID
 * @param {Object} updateData - { name, email }
 * @returns {Promise<Object>} updated user
 */
export const updateUser = async (id, updateData) => {
  const res = await apiClient.patch(`/users/${id}`, updateData);
  return res.data.data;
};

/**
 * Update user role (admin only).
 * @param {string} id - User ID
 * @param {string} role - 'admin' | 'viewer'
 * @returns {Promise<Object>} updated user
 */
export const updateUserRole = async (id, role) => {
  const res = await apiClient.patch(`/users/${id}/role`, { role });
  return res.data.data;
};

/**
 * Update user account status (admin only).
 * @param {string} id - User ID
 * @param {string} status - 'active' | 'inactive'
 * @returns {Promise<Object>} updated user
 */
export const updateUserStatus = async (id, status) => {
  const res = await apiClient.patch(`/users/${id}/status`, { status });
  return res.data.data;
};

export const userService = {
  fetchUsers,
  fetchUserById,
  createUser,
  updateUser,
  updateUserRole,
  updateUserStatus,
};
