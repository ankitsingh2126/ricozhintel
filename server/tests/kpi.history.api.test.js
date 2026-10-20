// Integration tests for KPI History REST API endpoint:
// GET /api/v1/kpis/:id/history
//
// Tests:
// - Authentication requirements (401 for unauthenticated)
// - Role authorization (both Admin and Viewer permitted)
// - Validation rules (400 for invalid ID, invalid page, invalid limit)
// - 404 for nonexistent KPI
// - Chronological ordering (newest first)
// - Pagination metadata and slicing
// - Mutation side-effects: POST /kpis baseline tracking & PATCH /kpis/:id history tracking
// - Deletion cleanup consistency (404 after deletion)
// - Empty history handling (no records in DB)

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDB } from '../src/config/db.js';
import { Department } from '../src/models/Department.js';
import { Kpi } from '../src/models/Kpi.js';
import { KpiHistory } from '../src/models/KpiHistory.js';
import { User } from '../src/models/User.js';
import { getAdminAuthHeader, getViewerAuthHeader } from './helpers/authHelper.js';

let app;
let departmentId;
let adminAuth;
let viewerAuth;

beforeAll(async () => {
  await connectDB();
  app = createApp();
});

afterAll(async () => {
  await mongoose.connection.close();
});

beforeEach(async () => {
  await Promise.all([
    Department.deleteMany({}),
    Kpi.deleteMany({}),
    KpiHistory.deleteMany({}),
    User.deleteMany({}),
  ]);

  adminAuth = await getAdminAuthHeader();
  viewerAuth = await getViewerAuthHeader();

  const dept = await Department.create({
    name: 'Logistics',
    code: 'LOG',
    head: 'Chief Logistics Officer',
  });
  departmentId = dept._id.toString();
});

describe('GET /api/v1/kpis/:id/history - API Integration Tests', () => {
  test('rejects unauthenticated requests with 401', async () => {
    const kpi = await Kpi.create({
      name: 'Fleet Utilization',
      code: 'LOG-FLT',
      department: departmentId,
      target: 95,
      currentValue: 80,
    });

    const res = await request(app).get(`/api/v1/kpis/${kpi._id}/history`);
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  test('allows Viewer role to read history', async () => {
    const kpi = await Kpi.create({
      name: 'Fleet Utilization',
      code: 'LOG-FLT',
      department: departmentId,
      target: 95,
      currentValue: 80,
    });

    await KpiHistory.create({
      kpi: kpi._id,
      previousValue: 0,
      newValue: 80,
      target: 95,
      status: 'on_track',
      changeType: 'initial',
    });

    const res = await request(app)
      .get(`/api/v1/kpis/${kpi._id}/history`)
      .set(viewerAuth);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].newValue).toBe(80);
    expect(res.body.meta).toEqual({
      page: 1,
      limit: 20,
      total: 1,
      pages: 1,
    });
  });

  test('allows Admin role to read history', async () => {
    const kpi = await Kpi.create({
      name: 'On-Time Dispatch',
      code: 'LOG-OTD',
      department: departmentId,
      target: 98,
      currentValue: 92,
    });

    await KpiHistory.create({
      kpi: kpi._id,
      previousValue: 0,
      newValue: 92,
      target: 98,
      status: 'on_track',
      changeType: 'initial',
    });

    const res = await request(app)
      .get(`/api/v1/kpis/${kpi._id}/history`)
      .set(adminAuth);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
  });

  test('rejects invalid MongoId with structured 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .get('/api/v1/kpis/invalid-id-format/history')
      .set(adminAuth);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'id' })])
    );
  });

  test('rejects invalid pagination parameters with 400 VALIDATION_ERROR', async () => {
    const kpi = await Kpi.create({
      name: 'Fuel Economy',
      code: 'LOG-FUEL',
      department: departmentId,
      target: 8,
      currentValue: 6,
    });

    // page < 1
    const res1 = await request(app)
      .get(`/api/v1/kpis/${kpi._id}/history?page=0`)
      .set(adminAuth);
    expect(res1.status).toBe(400);
    expect(res1.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'page' })])
    );

    // limit > 100
    const res2 = await request(app)
      .get(`/api/v1/kpis/${kpi._id}/history?limit=150`)
      .set(adminAuth);
    expect(res2.status).toBe(400);
    expect(res2.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'limit' })])
    );
  });

  test('returns 404 NOT_FOUND for nonexistent KPI', async () => {
    const nonexistentId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .get(`/api/v1/kpis/${nonexistentId}/history`)
      .set(adminAuth);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error.message).toBe('KPI not found');
  });

  test('returns chronological ordering (newest first) and supports pagination', async () => {
    const kpi = await Kpi.create({
      name: 'Warehouse Turnaround',
      code: 'LOG-WT',
      department: departmentId,
      target: 60,
      currentValue: 90,
    });

    // Create 3 historical records with distinct timestamps
    const now = Date.now();
    await KpiHistory.create([
      {
        kpi: kpi._id,
        previousValue: 0,
        newValue: 90,
        target: 60,
        status: 'at_risk',
        changeType: 'initial',
        note: 'Baseline entry',
        createdAt: new Date(now - 3000),
      },
      {
        kpi: kpi._id,
        previousValue: 90,
        newValue: 75,
        target: 60,
        status: 'at_risk',
        changeType: 'value_update',
        note: 'Mid-month check-in',
        createdAt: new Date(now - 2000),
      },
      {
        kpi: kpi._id,
        previousValue: 75,
        newValue: 58,
        target: 60,
        status: 'on_track',
        changeType: 'value_update',
        note: 'Final month achievement',
        createdAt: new Date(now - 1000),
      },
    ]);

    // Page 1: limit 2
    const resPage1 = await request(app)
      .get(`/api/v1/kpis/${kpi._id}/history?page=1&limit=2`)
      .set(viewerAuth);

    expect(resPage1.status).toBe(200);
    expect(resPage1.body.data).toHaveLength(2);
    expect(resPage1.body.meta).toEqual({
      page: 1,
      limit: 2,
      total: 3,
      pages: 2,
    });
    // Newest first:
    expect(resPage1.body.data[0].newValue).toBe(58);
    expect(resPage1.body.data[0].note).toBe('Final month achievement');
    expect(resPage1.body.data[1].newValue).toBe(75);

    // Page 2: limit 2
    const resPage2 = await request(app)
      .get(`/api/v1/kpis/${kpi._id}/history?page=2&limit=2`)
      .set(viewerAuth);

    expect(resPage2.status).toBe(200);
    expect(resPage2.body.data).toHaveLength(1);
    expect(resPage2.body.meta.page).toBe(2);
    expect(resPage2.body.data[0].newValue).toBe(90);
    expect(resPage2.body.data[0].changeType).toBe('initial');
  });

  test('records user context on POST /kpis and PATCH /kpis/:id mutations', async () => {
    // 1. Create KPI via HTTP POST
    const createRes = await request(app)
      .post('/api/v1/kpis')
      .set(adminAuth)
      .send({
        name: 'Return Merchandise Rate',
        code: 'LOG-RMR',
        department: departmentId,
        target: 3,
        currentValue: 5,
        unit: '%',
        note: 'Initial import note',
      });

    expect(createRes.status).toBe(201);
    const kpiId = createRes.body.data._id;

    // 2. Update KPI currentValue via HTTP PATCH
    const updateRes = await request(app)
      .patch(`/api/v1/kpis/${kpiId}`)
      .set(adminAuth)
      .send({
        currentValue: 2.8,
        status: 'on_track',
        note: 'Improved packaging reduced returns',
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.currentValue).toBe(2.8);

    // 3. Inspect history via HTTP GET
    const historyRes = await request(app)
      .get(`/api/v1/kpis/${kpiId}/history`)
      .set(viewerAuth);

    expect(historyRes.status).toBe(200);
    expect(historyRes.body.data).toHaveLength(2);

    // Check latest value update entry
    const latest = historyRes.body.data[0];
    expect(latest.previousValue).toBe(5);
    expect(latest.newValue).toBe(2.8);
    expect(latest.note).toBe('Improved packaging reduced returns');
    expect(latest.changedByName).toBeDefined();
    expect(latest.changedBy).toBeDefined();
    expect(latest.changedBy.role).toBe('admin');

    // Check baseline initial entry
    const baseline = historyRes.body.data[1];
    expect(baseline.changeType).toBe('initial');
    expect(baseline.previousValue).toBe(0);
    expect(baseline.newValue).toBe(5);
    expect(baseline.note).toBe('Initial import note');
  });

  test('deleting KPI cleans up history and subsequent GET returns 404', async () => {
    // Create KPI via POST
    const createRes = await request(app)
      .post('/api/v1/kpis')
      .set(adminAuth)
      .send({
        name: 'Freight Damage Cost',
        code: 'LOG-FDC',
        department: departmentId,
        target: 1000,
        currentValue: 1200,
      });

    const kpiId = createRes.body.data._id;

    // Update value
    await request(app)
      .patch(`/api/v1/kpis/${kpiId}`)
      .set(adminAuth)
      .send({ currentValue: 900 });

    // Confirm 2 history records exist
    const historyBefore = await KpiHistory.countDocuments({ kpi: kpiId });
    expect(historyBefore).toBe(2);

    // Delete KPI via DELETE
    const deleteRes = await request(app)
      .delete(`/api/v1/kpis/${kpiId}`)
      .set(adminAuth);
    expect(deleteRes.status).toBe(200);

    // Confirm history is cleaned up
    const historyAfter = await KpiHistory.countDocuments({ kpi: kpiId });
    expect(historyAfter).toBe(0);

    // GET /kpis/:id/history returns 404
    const getRes = await request(app)
      .get(`/api/v1/kpis/${kpiId}/history`)
      .set(viewerAuth);
    expect(getRes.status).toBe(404);
  });

  test('returns empty array gracefully when KPI has no history records in DB', async () => {
    // Create a KPI document directly without history records
    const legacyKpi = await Kpi.create({
      name: 'Legacy Metric Without History',
      code: 'LOG-LEG',
      department: departmentId,
      target: 100,
      currentValue: 50,
    });

    const res = await request(app)
      .get(`/api/v1/kpis/${legacyKpi._id}/history`)
      .set(viewerAuth);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta).toEqual({
      page: 1,
      limit: 20,
      total: 0,
      pages: 0,
    });
  });
});
