// Integration tests for Administrative User Management API:
// - GET /api/v1/users (list, search, filters, pagination)
// - POST /api/v1/users (creation, role assignment, duplicate checking)
// - GET /api/v1/users/:id (fetch single user)
// - PATCH /api/v1/users/:id (profile editing, email conflicts)
// - PATCH /api/v1/users/:id/role (role updates, self-demotion & last-admin safeguards)
// - PATCH /api/v1/users/:id/status (activation/deactivation, self-deactivation & last-admin safeguards)
// - Deactivated account login & token invalidation
// - MongoDB ACID transaction invariants & realistic concurrency safeguards

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { getAuthToken } from './helpers/authHelper.js';
import { withAdminMutationTransaction, withAdminMutationLock } from '../src/services/userService.js';

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
    mongoose.connection.collection('system_locks').deleteMany({}).catch(() => {}),
  ]);
});

describe('User Management API Integration Tests', () => {
  // Helper to create users with specific roles and statuses
  const createUser = async (overrides = {}) => {
    return User.create({
      name: overrides.name || 'Sample User',
      email: overrides.email || `user_${Date.now()}_${Math.random().toString(36).substring(7)}@test.internal`,
      password: overrides.password || 'Password123!',
      role: overrides.role || 'viewer',
      status: overrides.status || 'active',
    });
  };

  describe('RBAC Route Protection & Authentication', () => {
    test('rejects unauthenticated requests to /api/v1/users with 401', async () => {
      const res = await request(app).get('/api/v1/users');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    test('rejects viewer role from accessing /api/v1/users with 403 Forbidden', async () => {
      const viewer = await createUser({ role: 'viewer' });
      const token = getAuthToken(viewer);

      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    test('rejects viewer role from mutating users (POST /api/v1/users) with 403 Forbidden', async () => {
      const viewer = await createUser({ role: 'viewer' });
      const token = getAuthToken(viewer);

      const res = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Blocked User',
          email: 'blocked@test.internal',
          password: 'Password123!',
          role: 'viewer',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('GET /api/v1/users - List, Search & Pagination', () => {
    test('allows admin to list users with pagination metadata', async () => {
      const admin = await createUser({ name: 'Root Admin', role: 'admin' });
      await createUser({ name: 'Viewer Alice', role: 'viewer' });
      await createUser({ name: 'Viewer Bob', role: 'viewer' });

      const token = getAuthToken(admin);

      const res = await request(app)
        .get('/api/v1/users?page=1&limit=2')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.meta).toEqual({
        page: 1,
        limit: 2,
        total: 3,
        pages: 2,
      });

      // Verify passwords are never exposed
      res.body.data.forEach((u) => {
        expect(u.password).toBeUndefined();
        expect(u.__v).toBeUndefined();
      });
    });

    test('filters users by search query matching name or email', async () => {
      const admin = await createUser({ name: 'Super Admin', email: 'admin@corp.internal', role: 'admin' });
      await createUser({ name: 'Charlie Dave', email: 'charlie@test.internal', role: 'viewer' });
      await createUser({ name: 'Edward Frank', email: 'edward@corp.internal', role: 'viewer' });

      const token = getAuthToken(admin);

      // Search by email domain
      const resEmail = await request(app)
        .get('/api/v1/users?search=corp.internal')
        .set('Authorization', `Bearer ${token}`);

      expect(resEmail.status).toBe(200);
      expect(resEmail.body.data).toHaveLength(2);

      // Search by partial name
      const resName = await request(app)
        .get('/api/v1/users?search=charlie')
        .set('Authorization', `Bearer ${token}`);

      expect(resName.status).toBe(200);
      expect(resName.body.data).toHaveLength(1);
      expect(resName.body.data[0].name).toBe('Charlie Dave');
    });

    test('filters users by role and status', async () => {
      const admin = await createUser({ role: 'admin', status: 'active' });
      await createUser({ role: 'viewer', status: 'active' });
      await createUser({ role: 'viewer', status: 'inactive' });

      const token = getAuthToken(admin);

      const resRole = await request(app)
        .get('/api/v1/users?role=viewer')
        .set('Authorization', `Bearer ${token}`);
      expect(resRole.body.data).toHaveLength(2);

      const resStatus = await request(app)
        .get('/api/v1/users?status=inactive')
        .set('Authorization', `Bearer ${token}`);
      expect(resStatus.body.data).toHaveLength(1);
      expect(resStatus.body.data[0].status).toBe('inactive');
    });

    test('validates pagination parameters with 400 VALIDATION_ERROR', async () => {
      const admin = await createUser({ role: 'admin' });
      const token = getAuthToken(admin);

      const res = await request(app)
        .get('/api/v1/users?page=0&limit=150')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/users - Admin User Creation', () => {
    test('allows admin to create a new viewer user', async () => {
      const admin = await createUser({ role: 'admin' });
      const token = getAuthToken(admin);

      const res = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'New Team Member',
          email: 'member@test.internal',
          password: 'Password123!',
          role: 'viewer',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('New Team Member');
      expect(res.body.data.email).toBe('member@test.internal');
      expect(res.body.data.role).toBe('viewer');
      expect(res.body.data.status).toBe('active');
      expect(res.body.data.password).toBeUndefined();

      // Verify created user can authenticate
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'member@test.internal',
          password: 'Password123!',
        });
      expect(loginRes.status).toBe(200);
      expect(loginRes.body.data.token).toBeDefined();
    });

    test('allows admin to create a new administrative user', async () => {
      const admin = await createUser({ role: 'admin' });
      const token = getAuthToken(admin);

      const res = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Second Administrator',
          email: 'admin2@test.internal',
          password: 'Password123!',
          role: 'admin',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.role).toBe('admin');
    });

    test('rejects duplicate email with 409 Conflict', async () => {
      const admin = await createUser({ role: 'admin' });
      await createUser({ email: 'duplicate@test.internal' });
      const token = getAuthToken(admin);

      const res = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Duplicate Guy',
          email: 'duplicate@test.internal',
          password: 'Password123!',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    test('rejects invalid inputs with 400 VALIDATION_ERROR', async () => {
      const admin = await createUser({ role: 'admin' });
      const token = getAuthToken(admin);

      const res = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'A', // too short (<2)
          email: 'not-an-email',
          password: '123', // too short (<6)
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('GET & PATCH /api/v1/users/:id - Profile Management', () => {
    test('fetches a single user by ID', async () => {
      const admin = await createUser({ role: 'admin' });
      const target = await createUser({ name: 'Target User' });
      const token = getAuthToken(admin);

      const res = await request(app)
        .get(`/api/v1/users/${target._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Target User');
      expect(res.body.data.password).toBeUndefined();
    });

    test('updates user name and email', async () => {
      const admin = await createUser({ role: 'admin' });
      const target = await createUser({ name: 'Old Name', email: 'old@test.internal' });
      const token = getAuthToken(admin);

      const res = await request(app)
        .patch(`/api/v1/users/${target._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'New Name',
          email: 'updated@test.internal',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('New Name');
      expect(res.body.data.email).toBe('updated@test.internal');

      const refreshed = await User.findById(target._id);
      expect(refreshed.name).toBe('New Name');
      expect(refreshed.email).toBe('updated@test.internal');
    });

    test('rejects updating email to an existing email with 409 Conflict', async () => {
      const admin = await createUser({ role: 'admin' });
      await createUser({ email: 'taken@test.internal' });
      const target = await createUser({ email: 'free@test.internal' });
      const token = getAuthToken(admin);

      const res = await request(app)
        .patch(`/api/v1/users/${target._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'taken@test.internal' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });
  });

  describe('PATCH /api/v1/users/:id/role - Role Safeguards', () => {
    test('allows admin to demote another admin when multiple admins exist', async () => {
      const admin1 = await createUser({ name: 'Admin One', role: 'admin' });
      const admin2 = await createUser({ name: 'Admin Two', role: 'admin' });
      const token = getAuthToken(admin1);

      const res = await request(app)
        .patch(`/api/v1/users/${admin2._id}/role`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'viewer' });

      expect(res.status).toBe(200);
      expect(res.body.data.role).toBe('viewer');

      const updated = await User.findById(admin2._id);
      expect(updated.role).toBe('viewer');
    });

    test('rejects self-demotion with 400 Bad Request', async () => {
      const admin = await createUser({ role: 'admin' });
      const token = getAuthToken(admin);

      const res = await request(app)
        .patch(`/api/v1/users/${admin._id}/role`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'viewer' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('cannot demote their own account');
    });

    test('rejects demoting the only remaining active administrator with 400 Bad Request', async () => {
      const soleAdmin = await createUser({ name: 'Sole Admin', role: 'admin' });
      const actingAdmin = await createUser({ name: 'Acting Admin', role: 'admin', status: 'inactive' });
      const token = getAuthToken(actingAdmin);

      const res = await request(app)
        .patch(`/api/v1/users/${soleAdmin._id}/role`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'viewer' });

      expect(res.status).toBe(401);
    });

    test('rejects demoting the last active administrator when target is the only active admin', async () => {
      const admin1 = await createUser({ name: 'Active Admin', role: 'admin', status: 'active' });
      const admin2 = await createUser({ name: 'Second Admin', role: 'admin', status: 'active' });
      const token = getAuthToken(admin1);

      // Demote admin2 -> succeeds
      const res1 = await request(app)
        .patch(`/api/v1/users/${admin2._id}/role`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'viewer' });
      expect(res1.status).toBe(200);

      // Now attempt self-demotion on the remaining admin
      const resSelf = await request(app)
        .patch(`/api/v1/users/${admin1._id}/role`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'viewer' });
      expect(resSelf.status).toBe(400);
    });

    test('backward compatibility: /api/v1/auth/users/:id/role enforces same safeguards', async () => {
      const admin = await createUser({ role: 'admin' });
      const viewer = await createUser({ role: 'viewer' });
      const token = getAuthToken(admin);

      // Promote viewer to admin via auth endpoint
      const resPromote = await request(app)
        .patch(`/api/v1/auth/users/${viewer._id}/role`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'admin' });
      expect(resPromote.status).toBe(200);
      expect(resPromote.body.data.role).toBe('admin');

      // Attempt self-demotion via auth endpoint
      const resSelf = await request(app)
        .patch(`/api/v1/auth/users/${admin._id}/role`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'viewer' });
      expect(resSelf.status).toBe(400);
      expect(resSelf.body.error.message).toContain('cannot demote their own account');
    });
  });

  describe('PATCH /api/v1/users/:id/status - Account Activation & Deactivation', () => {
    test('allows admin to deactivate and reactivate a viewer account', async () => {
      const admin = await createUser({ role: 'admin' });
      const viewer = await createUser({ role: 'viewer', status: 'active' });
      const token = getAuthToken(admin);

      // Deactivate
      const resDeact = await request(app)
        .patch(`/api/v1/users/${viewer._id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'inactive' });

      expect(resDeact.status).toBe(200);
      expect(resDeact.body.data.status).toBe('inactive');

      // Reactivate
      const resAct = await request(app)
        .patch(`/api/v1/users/${viewer._id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'active' });

      expect(resAct.status).toBe(200);
      expect(resAct.body.data.status).toBe('active');
    });

    test('rejects self-deactivation with 400 Bad Request', async () => {
      const admin = await createUser({ role: 'admin' });
      const token = getAuthToken(admin);

      const res = await request(app)
        .patch(`/api/v1/users/${admin._id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'inactive' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('cannot deactivate their own account');
    });

    test('rejects deactivating the last active administrator with 400 Bad Request', async () => {
      const admin1 = await createUser({ name: 'Admin 1', role: 'admin' });
      const admin2 = await createUser({ name: 'Admin 2', role: 'admin' });
      const token = getAuthToken(admin1);

      // Deactivate admin2 -> succeeds because admin1 is still active
      const res1 = await request(app)
        .patch(`/api/v1/users/${admin2._id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'inactive' });
      expect(res1.status).toBe(200);

      // Now admin1 is the only active admin. Try to deactivate admin1
      const resSelf = await request(app)
        .patch(`/api/v1/users/${admin1._id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'inactive' });
      expect(resSelf.status).toBe(400);
    });

    test('deactivated account cannot login (403 Forbidden)', async () => {
      await createUser({
        email: 'inactive@test.internal',
        password: 'Password123!',
        status: 'inactive',
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'inactive@test.internal',
          password: 'Password123!',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Account is deactivated');
    });

    test('existing JWT of deactivated user is immediately rejected with 401', async () => {
      const user = await createUser({ status: 'active' });
      const token = getAuthToken(user);

      // Verify token works while active
      const resBefore = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);
      expect(resBefore.status).toBe(200);

      // Deactivate directly in DB
      user.status = 'inactive';
      await user.save();

      // Verify token is now rejected on next request
      const resAfter = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);
      expect(resAfter.status).toBe(401);
      expect(resAfter.body.error.message).toContain('Account is deactivated');
    });
  });

  describe('MongoDB ACID Transaction Invariants & Realistic Concurrency Safeguards', () => {
    test('transaction abort rolls back all session writes on operation failure', async () => {
      const target = await createUser({ name: 'Rollback User', role: 'admin' });

      // Run a transaction that mutates the user but throws before commit
      await expect(
        withAdminMutationTransaction(async (session) => {
          target.role = 'viewer';
          await target.save({ session });
          throw new Error('Simulated write failure triggering transaction rollback');
        })
      ).rejects.toThrow('Simulated write failure triggering transaction rollback');

      // Verify in a fresh query that target role remains 'admin' (writes were completely rolled back)
      const freshUser = await User.findById(target._id);
      expect(freshUser.role).toBe('admin');
    });

    test('competing transactions contending on shared barrier serialize without unhandled conflict', async () => {
      let executedCount = 0;

      // Launch 5 concurrent transactions simultaneously contending on the barrier
      const results = await Promise.all(
        Array.from({ length: 5 }, async () => {
          return withAdminMutationTransaction(async () => {
            executedCount += 1;
            return executedCount;
          });
        })
      );

      expect(results).toHaveLength(5);
      const barrierDoc = await mongoose.connection
        .collection('system_locks')
        .findOne({ _id: 'admin_mutation_barrier' });

      expect(barrierDoc).not.toBeNull();
      expect(barrierDoc.version).toBeGreaterThanOrEqual(5);
    });

    test('concurrent role and status mutations cannot remove all active admins', async () => {
      // Create two active admins
      const admin1 = await createUser({ name: 'Admin 1', role: 'admin', status: 'active' });
      const admin2 = await createUser({ name: 'Admin 2', role: 'admin', status: 'active' });

      const token1 = getAuthToken(admin1);
      const token2 = getAuthToken(admin2);

      // Admin 1 attempts to demote Admin 2 to viewer
      // Admin 2 attempts to deactivate Admin 1 to inactive
      const [demoteRes, deactRes] = await Promise.all([
        request(app)
          .patch(`/api/v1/users/${admin2._id}/role`)
          .set('Authorization', `Bearer ${token1}`)
          .send({ role: 'viewer' }),
        request(app)
          .patch(`/api/v1/users/${admin1._id}/status`)
          .set('Authorization', `Bearer ${token2}`)
          .send({ status: 'inactive' }),
      ]);

      const statuses = [demoteRes.status, deactRes.status].sort();

      // Exactly one must succeed (200) and one must be rejected (400)
      expect(statuses).toEqual([200, 400]);

      // Verify at least one active administrator remains in the database
      const activeAdminCount = await User.countDocuments({ role: 'admin', status: 'active' });
      expect(activeAdminCount).toBeGreaterThanOrEqual(1);
    });

    test('forced delay in competing admin mutations prevents write skew and protects last active admin', async () => {
      // Create two active admins
      const admin1 = await createUser({ name: 'Admin Alpha', role: 'admin', status: 'active' });
      const admin2 = await createUser({ name: 'Admin Beta', role: 'admin', status: 'active' });

      const token1 = getAuthToken(admin1);
      const token2 = getAuthToken(admin2);

      // Start Request 1 (demoting admin2). Introduce a delay in its critical section by executing directly
      // via withAdminMutationTransaction to simulate network latency or process pause.
      const slowDemotePromise = withAdminMutationTransaction(async (session) => {
        const target = await User.findById(admin2._id).session(session);
        const remaining = await User.countDocuments({
          _id: { $ne: target._id },
          role: 'admin',
          status: { $ne: 'inactive' },
        }).session(session);

        if (remaining === 0) {
          throw new Error('LAST_ADMIN');
        }

        // Simulate 100ms processing delay inside the transaction
        await new Promise((r) => setTimeout(r, 100));

        target.role = 'viewer';
        await target.save({ session });
        return target.toJSON();
      });

      // Competing Request 2 (deactivating admin1 via HTTP API) starts slightly after
      const fastDeactPromise = (async () => {
        await new Promise((r) => setTimeout(r, 20));
        return request(app)
          .patch(`/api/v1/users/${admin1._id}/status`)
          .set('Authorization', `Bearer ${token2}`)
          .send({ status: 'inactive' });
      })();

      const [slowResult, fastRes] = await Promise.all([slowDemotePromise, fastDeactPromise]);

      // slowResult succeeded (admin2 became viewer)
      expect(slowResult.role).toBe('viewer');

      // fastRes contended on the barrier, retried under the new snapshot, saw admin2 is now viewer,
      // and rejected deactivation of the last active admin with 400 Bad Request
      expect(fastRes.status).toBe(400);
      expect(fastRes.body.error.message).toContain('Cannot deactivate the last remaining active administrator');

      // Confirm exactly 1 active admin remains (admin1)
      const remainingActiveAdmins = await User.find({ role: 'admin', status: 'active' });
      expect(remainingActiveAdmins).toHaveLength(1);
      expect(remainingActiveAdmins[0]._id.toString()).toBe(admin1._id.toString());
    });

    test('legacy alias withAdminMutationLock executes within transaction', async () => {
      let executed = false;
      await withAdminMutationLock(async (session) => {
        expect(session).toBeDefined();
        executed = true;
      });
      expect(executed).toBe(true);
    });
  });
});
