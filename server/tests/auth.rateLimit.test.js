// Integration tests for Targeted Authentication Rate Limiting (SEC-01).
// Verifies:
// - Requests within rate limit succeed or fail normally without 429
// - RateLimit headers (Limit, Remaining, Reset) are correctly returned
// - Requests exceeding the limit return HTTP 429 TOO_MANY_REQUESTS with Retry-After header
// - IP independence: rate-limiting one client does not block legitimate requests from other IPs
// - Registration and Bootstrap-Admin endpoints enforce their respective limits
// - Error messages do not disclose whether user accounts exist

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';

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

describe('Targeted Authentication Rate Limiting (SEC-01)', () => {
  describe('POST /api/v1/auth/login Rate Limiting', () => {
    test('enforces rate limit, returns standard 429 envelope and headers, and isolates by client IP', async () => {
      const clientIp1 = '203.0.113.10';
      const clientIp2 = '203.0.113.11';

      // Seed an active user for login tests
      await User.create({
        name: 'Rate Limit Target',
        email: 'target@test.internal',
        password: 'ValidPassword123!',
        role: 'viewer',
        status: 'active',
      });

      // 1. Send 10 failed login attempts from clientIp1 (within the allowed max of 10)
      for (let i = 1; i <= 10; i++) {
        const res = await request(app)
          .post('/api/v1/auth/login')
          .set('X-Forwarded-For', clientIp1)
          .send({
            email: 'target@test.internal',
            password: 'WrongPassword!',
          });

        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
        expect(res.body.error.message).toBe('Invalid email or password');

        // Standard rate limit headers must be present
        expect(res.headers['ratelimit-limit']).toBeDefined();
        expect(res.headers['ratelimit-remaining']).toBeDefined();
        expect(Number(res.headers['ratelimit-limit'])).toBe(10);
      }

      // 2. The 11th request from clientIp1 must be rejected with 429 Too Many Requests
      const blockedRes = await request(app)
        .post('/api/v1/auth/login')
        .set('X-Forwarded-For', clientIp1)
        .send({
          email: 'target@test.internal',
          password: 'ValidPassword123!',
        });

      expect(blockedRes.status).toBe(429);
      expect(blockedRes.body.success).toBe(false);
      expect(blockedRes.body.error.code).toBe('TOO_MANY_REQUESTS');
      expect(blockedRes.body.error.message).toBe(
        'Too many login attempts. Please try again in 15 minutes.'
      );
      expect(blockedRes.headers['retry-after']).toBeDefined();
      expect(blockedRes.headers['ratelimit-remaining']).toBe('0');

      // 3. Verify client isolation: clientIp2 is NOT blocked and can authenticate successfully
      const otherClientRes = await request(app)
        .post('/api/v1/auth/login')
        .set('X-Forwarded-For', clientIp2)
        .send({
          email: 'target@test.internal',
          password: 'ValidPassword123!',
        });

      expect(otherClientRes.status).toBe(200);
      expect(otherClientRes.body.success).toBe(true);
      expect(otherClientRes.body.data.user.email).toBe('target@test.internal');
      expect(Number(otherClientRes.headers['ratelimit-remaining'])).toBe(9);
    });

    test('does not disclose whether user account exists before rate limit is reached', async () => {
      const clientIp = '203.0.113.15';

      // Non-existent email
      const nonExistentRes = await request(app)
        .post('/api/v1/auth/login')
        .set('X-Forwarded-For', clientIp)
        .send({
          email: 'nonexistent-user@test.internal',
          password: 'SomePassword123!',
        });

      // Existing email with wrong password
      await User.create({
        name: 'Existing User',
        email: 'existing-user@test.internal',
        password: 'RealPassword123!',
      });

      const wrongPassRes = await request(app)
        .post('/api/v1/auth/login')
        .set('X-Forwarded-For', clientIp)
        .send({
          email: 'existing-user@test.internal',
          password: 'WrongPassword123!',
        });

      // Both must return identical generic error messages
      expect(nonExistentRes.status).toBe(401);
      expect(wrongPassRes.status).toBe(401);
      expect(nonExistentRes.body.error.message).toBe('Invalid email or password');
      expect(wrongPassRes.body.error.message).toBe('Invalid email or password');
    });
  });

  describe('POST /api/v1/auth/register Rate Limiting', () => {
    test('enforces registration limit and rejects after 10 creation attempts', async () => {
      const clientIp = '203.0.113.20';

      // Perform 10 registration attempts
      for (let i = 1; i <= 10; i++) {
        const res = await request(app)
          .post('/api/v1/auth/register')
          .set('X-Forwarded-For', clientIp)
          .send({
            name: `User ${i}`,
            email: `registered_${i}@test.internal`,
            password: 'Password123!',
          });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
      }

      // 11th registration attempt must be rate-limited
      const rateLimitedRes = await request(app)
        .post('/api/v1/auth/register')
        .set('X-Forwarded-For', clientIp)
        .send({
          name: 'User 11',
          email: 'registered_11@test.internal',
          password: 'Password123!',
        });

      expect(rateLimitedRes.status).toBe(429);
      expect(rateLimitedRes.body.success).toBe(false);
      expect(rateLimitedRes.body.error.code).toBe('TOO_MANY_REQUESTS');
      expect(rateLimitedRes.body.error.message).toBe(
        'Too many account registration attempts. Please try again in 15 minutes.'
      );
    });
  });

  describe('POST /api/v1/auth/bootstrap-admin Rate Limiting', () => {
    beforeAll(() => {
      process.env.TEST_RATE_LIMIT_BOOTSTRAP_MAX = '5';
    });

    afterAll(() => {
      delete process.env.TEST_RATE_LIMIT_BOOTSTRAP_MAX;
    });

    test('enforces strict 5-request limit on administrative bootstrap endpoint', async () => {
      const clientIp = '203.0.113.30';

      // Send 5 invalid bootstrap attempts
      for (let i = 1; i <= 5; i++) {
        const res = await request(app)
          .post('/api/v1/auth/bootstrap-admin')
          .set('X-Forwarded-For', clientIp)
          .send({
            name: 'Attacker Admin',
            email: 'attacker@test.internal',
            password: 'Password123!',
            bootstrapSecret: `wrong-secret-${i}`,
          });

        expect(res.status).toBe(403);
      }

      // 6th attempt must be blocked with HTTP 429
      const blockedRes = await request(app)
        .post('/api/v1/auth/bootstrap-admin')
        .set('X-Forwarded-For', clientIp)
        .send({
          name: 'Attacker Admin',
          email: 'attacker@test.internal',
          password: 'Password123!',
          bootstrapSecret: 'wrong-secret-6',
        });

      expect(blockedRes.status).toBe(429);
      expect(blockedRes.body.success).toBe(false);
      expect(blockedRes.body.error.code).toBe('TOO_MANY_REQUESTS');
      expect(blockedRes.body.error.message).toBe(
        'Too many administrative bootstrap attempts. Please try again in 15 minutes.'
      );
      expect(blockedRes.headers['retry-after']).toBeDefined();
    });
  });
});
