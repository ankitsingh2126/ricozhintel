// Tests for user management service (userService.js).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as userService from '../services/userService.js';
import { apiClient } from '../services/apiClient.js';

vi.mock('../services/apiClient.js');

describe('userService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchUsers', () => {
    it('requests users with query parameters and unwraps items and meta', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: [
            { _id: 'u-1', name: 'Alice Admin', email: 'alice@test.internal', role: 'admin', status: 'active' },
            { _id: 'u-2', name: 'Bob Viewer', email: 'bob@test.internal', role: 'viewer', status: 'active' },
          ],
          meta: { page: 1, limit: 10, total: 2, pages: 1 },
        },
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const params = { search: 'alice', role: 'admin', status: 'active', page: 1, limit: 10 };
      const result = await userService.fetchUsers(params);

      expect(apiClient.get).toHaveBeenCalledWith('/users', { params });
      expect(result.items).toHaveLength(2);
      expect(result.items[0].name).toBe('Alice Admin');
      expect(result.meta).toEqual(mockResponse.data.meta);
    });

    it('defaults params to empty object if not provided', async () => {
      apiClient.get.mockResolvedValue({
        data: { success: true, data: [], meta: { page: 1, limit: 20, total: 0, pages: 1 } },
      });

      const result = await userService.fetchUsers();
      expect(apiClient.get).toHaveBeenCalledWith('/users', { params: {} });
      expect(result.items).toEqual([]);
    });
  });

  describe('fetchUserById', () => {
    it('requests single user by id and unwraps data', async () => {
      const mockUser = {
        _id: 'u-1',
        name: 'Alice Admin',
        email: 'alice@test.internal',
        role: 'admin',
        status: 'active',
      };

      apiClient.get.mockResolvedValue({ data: { success: true, data: mockUser } });

      const result = await userService.fetchUserById('u-1');
      expect(apiClient.get).toHaveBeenCalledWith('/users/u-1');
      expect(result).toEqual(mockUser);
    });
  });

  describe('createUser', () => {
    it('posts new user payload and returns created user', async () => {
      const newUserPayload = {
        name: 'Charlie New',
        email: 'charlie@test.internal',
        password: 'Password123!',
        role: 'viewer',
        status: 'active',
      };

      const createdUser = { _id: 'u-3', ...newUserPayload };
      delete createdUser.password;

      apiClient.post.mockResolvedValue({ data: { success: true, data: createdUser } });

      const result = await userService.createUser(newUserPayload);
      expect(apiClient.post).toHaveBeenCalledWith('/users', newUserPayload);
      expect(result).toEqual(createdUser);
    });
  });

  describe('updateUser', () => {
    it('patches user profile fields and returns updated user', async () => {
      const updatePayload = { name: 'Alice Updated', email: 'alice.new@test.internal' };
      const updatedUser = { _id: 'u-1', ...updatePayload, role: 'admin', status: 'active' };

      apiClient.patch.mockResolvedValue({ data: { success: true, data: updatedUser } });

      const result = await userService.updateUser('u-1', updatePayload);
      expect(apiClient.patch).toHaveBeenCalledWith('/users/u-1', updatePayload);
      expect(result.name).toBe('Alice Updated');
    });
  });

  describe('updateUserRole', () => {
    it('patches user role with { role } and returns updated user', async () => {
      const updatedUser = { _id: 'u-2', name: 'Bob Promoted', role: 'admin', status: 'active' };

      apiClient.patch.mockResolvedValue({ data: { success: true, data: updatedUser } });

      const result = await userService.updateUserRole('u-2', 'admin');
      expect(apiClient.patch).toHaveBeenCalledWith('/users/u-2/role', { role: 'admin' });
      expect(result.role).toBe('admin');
    });
  });

  describe('updateUserStatus', () => {
    it('patches user status with { status } and returns updated user', async () => {
      const updatedUser = { _id: 'u-2', name: 'Bob Deactivated', role: 'viewer', status: 'inactive' };

      apiClient.patch.mockResolvedValue({ data: { success: true, data: updatedUser } });

      const result = await userService.updateUserStatus('u-2', 'inactive');
      expect(apiClient.patch).toHaveBeenCalledWith('/users/u-2/status', { status: 'inactive' });
      expect(result.status).toBe('inactive');
    });
  });

  describe('Error handling', () => {
    it('propagates API client errors', async () => {
      const apiError = new Error('Cannot demote the last remaining active administrator');
      apiError.status = 400;
      apiError.code = 'BAD_REQUEST';

      apiClient.patch.mockRejectedValue(apiError);

      await expect(userService.updateUserRole('u-1', 'viewer')).rejects.toThrow(
        'Cannot demote the last remaining active administrator'
      );
    });
  });
});
