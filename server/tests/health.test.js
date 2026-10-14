// Health endpoint tests.

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDB } from '../src/config/db.js';

let app;

beforeAll(async () => {
  await connectDB();
  app = createApp();
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('GET /api/v1/health', () => {
  test('returns 200 with expected shape', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      service: 'ricozhintel-api',
      status: 'ok',
      db: 'connected',
    });
    expect(typeof res.body.data.uptime).toBe('number');
    expect(typeof res.body.data.timestamp).toBe('string');
    expect(res.body.data.alias).toBeUndefined();
  });
});

describe('GET /api/health (alias)', () => {
  test('returns 200 with the same shape, plus alias: true', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      service: 'ricozhintel-api',
      status: 'ok',
      db: 'connected',
      alias: true,
    });
  });
});

describe('Unknown route under /api', () => {
  test('returns 404 with the standard error envelope', async () => {
    const res = await request(app).get('/api/v1/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error.message).toContain('/api/v1/does-not-exist');
  });
});
