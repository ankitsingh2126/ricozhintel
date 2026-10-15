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
  await Promise.all([
    User.deleteMany({}),
    Department.deleteMany({}),
    mongoose.connection.collection('system_locks').deleteMany({}).catch(() => {}),
  ]);
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

    test('rejects attempt to register with role: "admin" with 400 Validation Error', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Privilege Escalation Attacker',
          email: 'attacker@test.internal',
          password: 'Password123!',
          role: 'admin',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');

      const user = await User.findOne({ email: 'attacker@test.internal' });
      expect(user).toBeNull();
    });

    test('accepts registration when role is explicitly viewer', async () => {
      await User.create({
        name: 'Root Admin',
        email: 'root-admin@test.internal',
        password: 'Password123!',
        role: 'admin',
      });

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Explicit Viewer',
          email: 'explicit-viewer@test.internal',
          password: 'Password123!',
          role: 'viewer',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('viewer');
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

  describe('Controlled Administrator Bootstrap (POST /api/v1/auth/bootstrap-admin)', () => {
    const originalSecret = process.env.ADMIN_BOOTSTRAP_SECRET;

    beforeEach(() => {
      process.env.ADMIN_BOOTSTRAP_SECRET = 'valid-test-bootstrap-secret-12345';
    });

    afterAll(() => {
      if (originalSecret !== undefined) {
        process.env.ADMIN_BOOTSTRAP_SECRET = originalSecret;
      } else {
        delete process.env.ADMIN_BOOTSTRAP_SECRET;
      }
    });

    test('rejects bootstrap when secret does not match', async () => {
      const res = await request(app)
        .post('/api/v1/auth/bootstrap-admin')
        .send({
          name: 'Fake Admin',
          email: 'fake-admin@test.internal',
          password: 'Password123!',
          bootstrapSecret: 'wrong-secret',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('bootstrap secret');
    });

    test('provisions first administrator with valid secret', async () => {
      const res = await request(app)
        .post('/api/v1/auth/bootstrap-admin')
        .send({
          name: 'Real Admin',
          email: 'real-admin@test.internal',
          password: 'Password123!',
          bootstrapSecret: 'valid-test-bootstrap-secret-12345',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('admin');
      expect(res.body.data.user.email).toBe('real-admin@test.internal');
    });

    test('locks down and rejects subsequent bootstrap when an administrator already exists', async () => {
      await User.create({
        name: 'Existing Admin',
        email: 'existing-admin@test.internal',
        password: 'Password123!',
        role: 'admin',
      });

      const res = await request(app)
        .post('/api/v1/auth/bootstrap-admin')
        .send({
          name: 'Second Admin Attempt',
          email: 'second-admin@test.internal',
          password: 'Password123!',
          bootstrapSecret: 'valid-test-bootstrap-secret-12345',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('already been provisioned');
    });

    test('fails closed with 403 when ADMIN_BOOTSTRAP_SECRET is unset in environment', async () => {
      delete process.env.ADMIN_BOOTSTRAP_SECRET;

      const res = await request(app)
        .post('/api/v1/auth/bootstrap-admin')
        .send({
          name: 'Unconfigured Admin',
          email: 'unconfigured@test.internal',
          password: 'Password123!',
          bootstrapSecret: 'any-secret',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('unconfigured admin bootstrap secret');
    });

    test('handles concurrent bootstrap requests atomically and allows exactly one administrator', async () => {
      const [res1, res2] = await Promise.all([
        request(app)
          .post('/api/v1/auth/bootstrap-admin')
          .send({
            name: 'Concurrent Admin 1',
            email: 'concurrent1@test.internal',
            password: 'Password123!',
            bootstrapSecret: 'valid-test-bootstrap-secret-12345',
          }),
        request(app)
          .post('/api/v1/auth/bootstrap-admin')
          .send({
            name: 'Concurrent Admin 2',
            email: 'concurrent2@test.internal',
            password: 'Password123!',
            bootstrapSecret: 'valid-test-bootstrap-secret-12345',
          }),
      ]);

      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([201, 403]);

      const adminCount = await User.countDocuments({ role: 'admin' });
      expect(adminCount).toBe(1);
    });
  });

  describe('Administrative Role Management (PATCH /api/v1/auth/users/:id/role)', () => {
    test('rejects unauthenticated request with 401 Unauthorized', async () => {
      const targetUser = await User.create({
        name: 'Target User',
        email: 'target@test.internal',
        password: 'Password123!',
        role: 'viewer',
      });

      const res = await request(app)
        .patch(`/api/v1/auth/users/${targetUser._id}/role`)
        .send({ role: 'admin' });

      expect(res.status).toBe(401);
    });

    test('rejects viewer attempting to promote another user with 403 Forbidden', async () => {
      const viewer = await User.create({
        name: 'Normal Viewer',
        email: 'viewer-actor@test.internal',
        password: 'Password123!',
        role: 'viewer',
      });
      const targetUser = await User.create({
        name: 'Target User',
        email: 'target-2@test.internal',
        password: 'Password123!',
        role: 'viewer',
      });
      const token = getAuthToken(viewer);

      const res = await request(app)
        .patch(`/api/v1/auth/users/${targetUser._id}/role`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'admin' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    test('allows authenticated administrator to promote a viewer to admin', async () => {
      const admin = await User.create({
        name: 'Super Admin',
        email: 'super-admin@test.internal',
        password: 'Password123!',
        role: 'admin',
      });
      const targetUser = await User.create({
        name: 'Promoted User',
        email: 'promoted@test.internal',
        password: 'Password123!',
        role: 'viewer',
      });
      const token = getAuthToken(admin);

      const res = await request(app)
        .patch(`/api/v1/auth/users/${targetUser._id}/role`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'admin' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe('admin');

      const updated = await User.findById(targetUser._id);
      expect(updated.role).toBe('admin');
    });
  });
});
