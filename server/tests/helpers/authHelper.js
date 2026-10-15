// Test helper for creating authenticated test users and auth headers in integration tests.

import jwt from 'jsonwebtoken';
import { env } from '../../src/config/env.js';
import { User } from '../../src/models/User.js';

export const createTestUser = async ({
  name = 'Test User',
  email,
  password = 'Password123!',
  role = 'admin',
} = {}) => {
  const uniqueEmail = email || `user-${Date.now()}-${Math.random()}@test.internal`;
  return await User.create({ name, email: uniqueEmail, password, role });
};

export const getAuthToken = (user) => {
  return jwt.sign(
    {
      id: user._id.toString(),
      role: user.role,
      email: user.email,
    },
    env.jwtSecret,
    { expiresIn: '1h' }
  );
};

export const getAdminAuthHeader = async () => {
  const admin = await createTestUser({ role: 'admin' });
  const token = getAuthToken(admin);
  return { Authorization: `Bearer ${token}` };
};

export const getViewerAuthHeader = async () => {
  const viewer = await createTestUser({ role: 'viewer' });
  const token = getAuthToken(viewer);
  return { Authorization: `Bearer ${token}` };
};
