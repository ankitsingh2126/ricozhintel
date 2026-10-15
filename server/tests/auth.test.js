// Integration tests for Authentication and Role-Based Access Control (RBAC).

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { Department } from '../src/models/Department.js';
import { getAuthToken } from './helpers/authHelper.js';

let app;

beforeAll(async () => {
  await connectDB();
  app = createApp();
});

afterAll(async () => {
  await mongoose.connection.close();
});

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Department.deleteMany({})]);
});

describe('Authentication & RBAC API', () => {
  describe('POST /api/v1/auth/register', () => {
    test('registers first user and automatically grants admin role', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'First Admin',
          email: 'admin@test.internal',
          password: 'Password123!',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('admin');
      expect(res.body.data.user.email).toBe('admin@test.internal');
      expect(res.body.data.user.password).toBeUndefined();
      expect(res.body.data.token).toBeDefined();
    });

    test('registers subsequent user as viewer by default', async () => {
      // First user becomes admin
      await User.create({
        name: 'Root Admin',
        email: 'root@test.internal',
        password: 'Password123!',
        role: 'admin',
      });

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Second Viewer',
          email: 'viewer@test.internal',
          password: 'Password123!',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('viewer');
      expect(res.body.data.token).toBeDefined();
    });

    test('rejects duplicate email with 409 Conflict', async () => {
      await User.create({
        name: 'Existing User',
        email: 'dup@test.internal',
        password: 'Password123!',
      });

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Another User',
          email: 'dup@test.internal',
          password: 'Password123!',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    test('rejects short password with 400 Validation Error', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Short Pass User',
          email: 'short@test.internal',
          password: '123',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      await User.create({
        name: 'Login Tester',
        email: 'tester@test.internal',
        password: 'ValidPassword123!',
        role: 'admin',
      });
    });

    test('logs in successfully with valid credentials and returns JWT', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'tester@test.internal',
          password: 'ValidPassword123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('tester@test.internal');
      expect(res.body.data.user.password).toBeUndefined();
      expect(res.body.data.token).toBeDefined();
    });

    test('rejects incorrect password with 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'tester@test.internal',
          password: 'WrongPassword!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    test('rejects nonexistent user with 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'ghost@test.internal',
          password: 'ValidPassword123!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    test('returns user profile when authenticated with Bearer token', async () => {
      const user = await User.create({
        name: 'Profile Tester',
        email: 'profile@test.internal',
        password: 'Password123!',
        role: 'viewer',
      });
      const token = getAuthToken(user);

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('profile@test.internal');
      expect(res.body.data.role).toBe('viewer');
    });

    test('rejects unauthenticated request with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/v1/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    test('rejects invalid token with 401 Unauthorized', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token-sample');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('RBAC Route Protection', () => {
    test('unauthenticated request to GET /api/v1/departments returns 401', async () => {
      const res = await request(app).get('/api/v1/departments');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    test('viewer role can read departments (GET /api/v1/departments)', async () => {
      const viewer = await User.create({
        name: 'Viewer User',
        email: 'viewer-role@test.internal',
        password: 'Password123!',
        role: 'viewer',
      });
      const token = getAuthToken(viewer);

      const res = await request(app)
        .get('/api/v1/departments')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('viewer role cannot create departments (POST returns 403 Forbidden)', async () => {
      const viewer = await User.create({
        name: 'Viewer Mutate',
        email: 'viewer-mutate@test.internal',
        password: 'Password123!',
        role: 'viewer',
      });
      const token = getAuthToken(viewer);

      const res = await request(app)
        .post('/api/v1/departments')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Blocked Dept', code: 'BLK' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    test('admin role can create departments (POST returns 201 Created)', async () => {
      const admin = await User.create({
        name: 'Admin User',
        email: 'admin-create@test.internal',
        password: 'Password123!',
        role: 'admin',
      });
      const token = getAuthToken(admin);

      const res = await request(app)
        .post('/api/v1/departments')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Allowed Dept', code: 'ALLW' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Allowed Dept');
    });
  });
});
