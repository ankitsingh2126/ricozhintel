// KPI summary and aggregation tests.

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

describe('KPI Aggregation & Summary API', () => {
  test('GET /api/v1/kpis/summary returns status counts and average progress', async () => {
    const dept = await Department.create({ name: 'Sales', code: 'SAL' });
    await Kpi.create([
      {
        name: 'Sales A',
        code: 'SAL-A',
        department: dept._id,
        target: 100,
        currentValue: 50,
        status: 'on_track',
      },
      {
        name: 'Sales B',
        code: 'SAL-B',
        department: dept._id,
        target: 100,
        currentValue: 20,
        status: 'off_track',
      },
    ]);

    const res = await request(app).get('/api/v1/kpis/summary');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.total).toBe(2);
    expect(res.body.data.byStatus.on_track).toBe(1);
    expect(res.body.data.byStatus.off_track).toBe(1);
    expect(res.body.data.avgProgress).toBe(35); // (50 + 20) / 2
  });

  test('GET /api/v1/kpis/summary/by-department returns correct per-KPI average achievement without unit mixing', async () => {
    const dept1 = await Department.create({ name: 'Engineering', code: 'ENG' });
    const dept2 = await Department.create({ name: 'Marketing', code: 'MKT' });

    // In ENG:
    // KPI 1: target 100, current 80, higher_is_better => achievement = 80%
    // KPI 2: target 4, current 2, lower_is_better (e.g. bug rate) => achievement = (4/2)*100 = 200%
    // Average achievement for ENG: (80 + 200) / 2 = 140%
    await Kpi.create([
      {
        name: 'Feature Velocity',
        code: 'ENG-VEL',
        department: dept1._id,
        target: 100,
        currentValue: 80,
        status: 'on_track',
        statusRule: 'higher_is_better',
      },
      {
        name: 'Critical Bugs',
        code: 'ENG-BUGS',
        department: dept1._id,
        target: 4,
        currentValue: 2,
        status: 'completed',
        statusRule: 'lower_is_better',
      },
      {
        name: 'Leads Generated',
        code: 'MKT-LEADS',
        department: dept2._id,
        target: 1000,
        currentValue: 500,
        status: 'at_risk',
        statusRule: 'higher_is_better',
      },
    ]);

    const res = await request(app).get('/api/v1/kpis/summary/by-department');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(2);

    const engRow = res.body.data.find((r) => r.department.code === 'ENG');
    expect(engRow).toBeDefined();
    expect(engRow.total).toBe(2);
    expect(engRow.byStatus.on_track).toBe(1);
    expect(engRow.byStatus.completed).toBe(1);
    expect(engRow.avgAchievement).toBe(140);

    const mktRow = res.body.data.find((r) => r.department.code === 'MKT');
    expect(mktRow).toBeDefined();
    expect(mktRow.total).toBe(1);
    expect(mktRow.avgAchievement).toBe(50);
  });

  test('GET /api/v1/kpis/summary supports department, status, and period filters', async () => {
    const dept1 = await Department.create({ name: 'Finance', code: 'FIN' });
    const dept2 = await Department.create({ name: 'Human Resources', code: 'HR' });

    await Kpi.create([
      {
        name: 'Operating Margin',
        code: 'FIN-OPM',
        department: dept1._id,
        target: 20,
        currentValue: 18,
        status: 'on_track',
        period: 'quarterly',
      },
      {
        name: 'Headcount Growth',
        code: 'HR-HCG',
        department: dept2._id,
        target: 10,
        currentValue: 5,
        status: 'at_risk',
        period: 'monthly',
      },
    ]);

    // Filter by department
    const deptRes = await request(app).get(`/api/v1/kpis/summary?department=${dept1._id}`);
    expect(deptRes.status).toBe(200);
    expect(deptRes.body.data.total).toBe(1);
    expect(deptRes.body.data.byStatus.on_track).toBe(1);

    // Filter by period
    const periodRes = await request(app).get('/api/v1/kpis/summary?period=monthly');
    expect(periodRes.status).toBe(200);
    expect(periodRes.body.data.total).toBe(1);
    expect(periodRes.body.data.byStatus.at_risk).toBe(1);

    // Filter by status
    const statusRes = await request(app).get('/api/v1/kpis/summary?status=on_track');
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.data.total).toBe(1);

    // Filter by department in by-department summary
    const deptSummaryRes = await request(app).get(
      `/api/v1/kpis/summary/by-department?department=${dept1._id}`
    );
    expect(deptSummaryRes.status).toBe(200);
    expect(deptSummaryRes.body.data.length).toBe(1);
    expect(deptSummaryRes.body.data[0].department.code).toBe('FIN');
  });
});

