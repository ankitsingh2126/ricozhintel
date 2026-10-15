// Department CRUD and integrity tests.

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDB } from '../src/config/db.js';
import { Department } from '../src/models/Department.js';
import { Kpi } from '../src/models/Kpi.js';

let app;

beforeAll(async () => {
  await connectDB();
  app = createApp();
});

afterAll(async () => {
  await mongoose.connection.close();
});

beforeEach(async () => {
  await Promise.all([Department.deleteMany({}), Kpi.deleteMany({})]);
});

describe('Department API', () => {
  test('POST /api/v1/departments creates a new department', async () => {
    const res = await request(app)
      .post('/api/v1/departments')
      .send({ name: 'Operations', code: 'OPS', head: 'John Ops' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Operations');
    expect(res.body.data.code).toBe('OPS');
  });

  test('POST /api/v1/departments rejects missing name/code with 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/v1/departments')
      .send({ head: 'Only Head' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'name' }),
        expect.objectContaining({ field: 'code' }),
      ])
    );
  });

  test('POST /api/v1/departments rejects duplicate code with 409 CONFLICT', async () => {
    await Department.create({ name: 'Finance', code: 'FIN' });

    const res = await request(app)
      .post('/api/v1/departments')
      .send({ name: 'Financial Planning', code: 'FIN' });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  test('GET /api/v1/departments lists departments with pagination and search', async () => {
    await Department.create([
      { name: 'Engineering', code: 'ENG' },
      { name: 'Product', code: 'PROD' },
      { name: 'Marketing', code: 'MKT' },
    ]);

    const res = await request(app).get('/api/v1/departments?search=eng');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].code).toBe('ENG');
    expect(res.body.meta.total).toBe(1);
  });

  test('PATCH /api/v1/departments/:id updates department fields', async () => {
    const dept = await Department.create({ name: 'Human Resources', code: 'HR' });

    const res = await request(app)
      .patch(`/api/v1/departments/${dept._id}`)
      .send({ head: 'Sarah Connor', status: 'inactive' });

    expect(res.status).toBe(200);
    expect(res.body.data.head).toBe('Sarah Connor');
    expect(res.body.data.status).toBe('inactive');
  });

  test('PUT /api/v1/departments/:id functions as update alias', async () => {
    const dept = await Department.create({ name: 'Legal', code: 'LEG' });

    const res = await request(app)
      .put(`/api/v1/departments/${dept._id}`)
      .send({ head: 'Harvey Specter' });

    expect(res.status).toBe(200);
    expect(res.body.data.head).toBe('Harvey Specter');
  });

  test('DELETE /api/v1/departments/:id blocks deletion when KPIs are assigned', async () => {
    const dept = await Department.create({ name: 'Support', code: 'SUP' });
    await Kpi.create({
      name: 'Ticket Resolution Time',
      code: 'SUP-TTR',
      department: dept._id,
      target: 2,
      currentValue: 1.5,
    });

    const res = await request(app).delete(`/api/v1/departments/${dept._id}`);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toMatch(/assigned KPI/i);

    // Ensure department still exists
    const stillThere = await Department.findById(dept._id);
    expect(stillThere).not.toBeNull();
  });

  test('DELETE /api/v1/departments/:id succeeds when no KPIs are assigned', async () => {
    const dept = await Department.create({ name: 'Temporary', code: 'TEMP' });

    const res = await request(app).delete(`/api/v1/departments/${dept._id}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const deleted = await Department.findById(dept._id);
    expect(deleted).toBeNull();
  });
});
