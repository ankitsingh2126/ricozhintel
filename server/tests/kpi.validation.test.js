// KPI POST validation tests.

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDB } from '../src/config/db.js';
import { Department } from '../src/models/Department.js';
import { Kpi } from '../src/models/Kpi.js';

let app;
let departmentId;

beforeAll(async () => {
  await connectDB();
  app = createApp();
});

afterAll(async () => {
  await mongoose.connection.close();
});

beforeEach(async () => {
  await Promise.all([Department.deleteMany({}), Kpi.deleteMany({})]);

  const dept = await Department.create({
    name: 'Test Department',
    code: 'TEST',
    head: 'Tester',
  });
  departmentId = dept._id.toString();
});

describe('POST /api/v1/kpis - validation', () => {
  test('rejects missing name with structured 400', async () => {
    const res = await request(app)
      .post('/api/v1/kpis')
      .send({ code: 'X-1', department: departmentId, target: 100 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'name' }),
      ])
    );
  });

  test('rejects non-alphanumeric code (with spaces)', async () => {
    const res = await request(app)
      .post('/api/v1/kpis')
      .send({ name: 'Bad Code', code: 'has spaces', department: departmentId, target: 100 });

    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'code' }),
      ])
    );
  });

  test('rejects invalid department id format', async () => {
    const res = await request(app)
      .post('/api/v1/kpis')
      .send({ name: 'Valid Name', code: 'VALID-1', department: 'not-an-id', target: 100 });

    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'department' }),
      ])
    );
  });

  test('rejects negative target', async () => {
    const res = await request(app)
      .post('/api/v1/kpis')
      .send({ name: 'Valid Name', code: 'VALID-2', department: departmentId, target: -5 });

    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'target' }),
      ])
    );
  });

  test('rejects invalid statusRule value', async () => {
    const res = await request(app)
      .post('/api/v1/kpis')
      .send({
        name: 'Valid Name',
        code: 'VALID-3',
        department: departmentId,
        target: 100,
        statusRule: 'whatever',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'statusRule' }),
      ])
    );
  });

  test('accepts a valid payload and computes achievement', async () => {
    const res = await request(app)
      .post('/api/v1/kpis')
      .send({
        name: 'Good KPI',
        code: 'GOOD-1',
        department: departmentId,
        target: 100,
        currentValue: 40,
        statusRule: 'higher_is_better',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      name: 'Good KPI',
      code: 'GOOD-1',
      target: 100,
      currentValue: 40,
      achievement: 40,
    });
  });

  test('rejects POST against a non-existent department', async () => {
    const res = await request(app)
      .post('/api/v1/kpis')
      .send({
        name: 'Orphan KPI',
        code: 'ORPHAN-1',
        department: '000000000000000000000000',
        target: 100,
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
    expect(res.body.error.message).toMatch(/department does not exist/i);
  });
});
