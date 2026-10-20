// Unit/Integration tests for KPI History service logic and consistency strategy.

import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db.js';
import { Department } from '../src/models/Department.js';
import { Kpi } from '../src/models/Kpi.js';
import { KpiHistory } from '../src/models/KpiHistory.js';
import { User } from '../src/models/User.js';
import * as kpiService from '../src/services/kpiService.js';
import { createTestUser } from './helpers/authHelper.js';

let departmentId;
let testAdmin;

beforeAll(async () => {
  await connectDB();
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

  testAdmin = await createTestUser({
    name: 'Admin Test Lead',
    email: 'lead@test.internal',
    role: 'admin',
  });

  const dept = await Department.create({
    name: 'Operations',
    code: 'OPS',
    head: 'Director Ops',
  });
  departmentId = dept._id.toString();
});

describe('kpiService History Logic', () => {
  test('createKpi creates an initial baseline history record with user context', async () => {
    const kpi = await kpiService.createKpi(
      {
        name: 'Throughput Rate',
        code: 'OPS-TP',
        department: departmentId,
        target: 1000,
        currentValue: 250,
        unit: 'units',
        period: 'monthly',
      },
      testAdmin
    );

    expect(kpi).toBeDefined();
    expect(kpi.currentValue).toBe(250);

    const history = await KpiHistory.find({ kpi: kpi._id });
    expect(history).toHaveLength(1);
    expect(history[0].previousValue).toBe(0);
    expect(history[0].newValue).toBe(250);
    expect(history[0].target).toBe(1000);
    expect(history[0].status).toBe('on_track');
    expect(history[0].changeType).toBe('initial');
    expect(history[0].changedByName).toBe('Admin Test Lead');
    expect(String(history[0].changedBy)).toBe(String(testAdmin._id));
    expect(history[0].note).toBe('Initial baseline');
  });

  test('createKpi defaults to System user when user context is omitted', async () => {
    const kpi = await kpiService.createKpi({
      name: 'Uptime SLA',
      code: 'OPS-UP',
      department: departmentId,
      target: 99.9,
      currentValue: 99.5,
      unit: '%',
    });

    const history = await KpiHistory.find({ kpi: kpi._id });
    expect(history).toHaveLength(1);
    expect(history[0].changedByName).toBe('System');
    expect(history[0].changedBy).toBeNull();
    expect(history[0].changeType).toBe('initial');
  });

  test('updateKpi records history when currentValue changes', async () => {
    const kpi = await kpiService.createKpi(
      {
        name: 'Delivery Time',
        code: 'OPS-DEL',
        department: departmentId,
        target: 24,
        currentValue: 36,
        unit: 'hours',
      },
      testAdmin
    );

    const updated = await kpiService.updateKpi(
      kpi._id,
      {
        currentValue: 28,
        status: 'at_risk',
        note: 'Improved dispatch pipeline',
      },
      testAdmin
    );

    expect(updated.currentValue).toBe(28);

    const history = await KpiHistory.find({ kpi: kpi._id }).sort({ createdAt: -1 });
    expect(history).toHaveLength(2);

    // Most recent history entry:
    expect(history[0].previousValue).toBe(36);
    expect(history[0].newValue).toBe(28);
    expect(history[0].target).toBe(24);
    expect(history[0].status).toBe('at_risk');
    expect(history[0].note).toBe('Improved dispatch pipeline');
    expect(history[0].changeType).toBe('value_update');
    expect(history[0].changedByName).toBe('Admin Test Lead');

    // Baseline history entry:
    expect(history[1].changeType).toBe('initial');
    expect(history[1].previousValue).toBe(0);
    expect(history[1].newValue).toBe(36);
  });

  test('updateKpi does NOT record history for metadata-only edits', async () => {
    const kpi = await kpiService.createKpi(
      {
        name: 'Cycle Time',
        code: 'OPS-CYC',
        department: departmentId,
        target: 50,
        currentValue: 40,
        unit: 'mins',
        description: 'Original description',
      },
      testAdmin
    );

    // Initial check: only baseline exists
    expect(await KpiHistory.countDocuments({ kpi: kpi._id })).toBe(1);

    // Edit only description, owner, and name
    await kpiService.updateKpi(
      kpi._id,
      {
        description: 'Updated operational description',
        owner: 'Alice Manager',
      },
      testAdmin
    );

    // Still only 1 history entry
    expect(await KpiHistory.countDocuments({ kpi: kpi._id })).toBe(1);

    // Updating with identical currentValue does not record history
    await kpiService.updateKpi(
      kpi._id,
      {
        currentValue: 40,
      },
      testAdmin
    );

    expect(await KpiHistory.countDocuments({ kpi: kpi._id })).toBe(1);
  });

  test('deleteKpi cleans up all associated history records', async () => {
    const kpi = await kpiService.createKpi(
      {
        name: 'Scrap Rate',
        code: 'OPS-SCR',
        department: departmentId,
        target: 2,
        currentValue: 5,
        unit: '%',
      },
      testAdmin
    );

    // Add another history entry
    await kpiService.updateKpi(kpi._id, { currentValue: 4 }, testAdmin);
    expect(await KpiHistory.countDocuments({ kpi: kpi._id })).toBe(2);

    // Delete KPI
    await kpiService.deleteKpi(kpi._id);

    // Verify KPI and all its history are deleted
    expect(await Kpi.findById(kpi._id)).toBeNull();
    expect(await KpiHistory.countDocuments({ kpi: kpi._id })).toBe(0);
  });

  test('getKpiHistory returns paginated history sorted newest first', async () => {
    const kpi = await kpiService.createKpi(
      {
        name: 'Order Accuracy',
        code: 'OPS-ACC',
        department: departmentId,
        target: 99,
        currentValue: 90,
        unit: '%',
      },
      testAdmin
    );

    await kpiService.updateKpi(kpi._id, { currentValue: 92, note: 'Step 1' }, testAdmin);
    await kpiService.updateKpi(kpi._id, { currentValue: 95, note: 'Step 2' }, testAdmin);

    const historyResult = await kpiService.getKpiHistory(kpi._id, { page: 1, limit: 10 });
    expect(historyResult.items).toHaveLength(3);
    expect(historyResult.meta.total).toBe(3);
    expect(historyResult.items[0].newValue).toBe(95);
    expect(historyResult.items[0].note).toBe('Step 2');
    expect(historyResult.items[1].newValue).toBe(92);
    expect(historyResult.items[2].changeType).toBe('initial');
  });

  test('getKpiHistory throws 404 for non-existent KPI', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    await expect(kpiService.getKpiHistory(fakeId)).rejects.toMatchObject({
      statusCode: 404,
      message: 'KPI not found',
    });
  });

  test('compensating rollback: createKpi rolls back KPI if history creation fails', async () => {
    const originalCreate = KpiHistory.create;
    KpiHistory.create = jest.fn().mockRejectedValue(new Error('Simulated history DB failure'));

    await expect(
      kpiService.createKpi({
        name: 'Failing KPI',
        code: 'OPS-FAIL',
        department: departmentId,
        target: 100,
        currentValue: 10,
      })
    ).rejects.toMatchObject({
      statusCode: 500,
      message: 'Failed to record initial KPI history; creation rolled back',
    });

    // Confirm KPI was rolled back and not left orphaned in database
    const orphanedKpi = await Kpi.findOne({ code: 'OPS-FAIL' });
    expect(orphanedKpi).toBeNull();

    // Restore original method
    KpiHistory.create = originalCreate;
  });

  test('compensating rollback: updateKpi rolls back value if history creation fails', async () => {
    const kpi = await kpiService.createKpi(
      {
        name: 'Rollback Update KPI',
        code: 'OPS-RB',
        department: departmentId,
        target: 100,
        currentValue: 50,
      },
      testAdmin
    );

    const originalCreate = KpiHistory.create;
    KpiHistory.create = jest.fn().mockRejectedValue(new Error('Simulated history update failure'));

    await expect(
      kpiService.updateKpi(
        kpi._id,
        {
          currentValue: 80,
          status: 'completed',
        },
        testAdmin
      )
    ).rejects.toMatchObject({
      statusCode: 500,
      message: 'Failed to record KPI history; update rolled back',
    });

    // Confirm KPI reverted to original currentValue (50)
    const reverted = await Kpi.findById(kpi._id);
    expect(reverted.currentValue).toBe(50);

    // Restore original method
    KpiHistory.create = originalCreate;
  });

  test('compensating rollback: restores metadata AND metric values if history creation fails', async () => {
    const kpi = await kpiService.createKpi(
      {
        name: 'Full Rollback KPI',
        code: 'OPS-FRB',
        department: departmentId,
        target: 100,
        currentValue: 50,
        description: 'Original Description',
        owner: 'Original Owner',
      },
      testAdmin
    );

    const originalCreate = KpiHistory.create;
    KpiHistory.create = jest.fn().mockRejectedValue(new Error('Simulated history failure'));

    try {
      await expect(
        kpiService.updateKpi(
          kpi._id,
          {
            currentValue: 80,
            status: 'completed',
            description: 'Attempted Description',
            owner: 'Attempted Owner',
          },
          testAdmin
        )
      ).rejects.toMatchObject({
        statusCode: 500,
        message: 'Failed to record KPI history; update rolled back',
      });

      const reverted = await Kpi.findById(kpi._id);
      expect(reverted.currentValue).toBe(50);
      expect(reverted.status).toBe('on_track');
      expect(reverted.description).toBe('Original Description');
      expect(reverted.owner).toBe('Original Owner');
    } finally {
      KpiHistory.create = originalCreate;
    }
  });

  test('compensating rollback: restores default/empty values if history creation fails', async () => {
    const kpi = await kpiService.createKpi(
      {
        name: 'Default Rollback KPI',
        code: 'OPS-DEF',
        department: departmentId,
        target: 100,
        currentValue: 50,
      },
      testAdmin
    );

    // Initial state has empty string description per schema default
    expect(kpi.description).toBe('');

    const originalCreate = KpiHistory.create;
    KpiHistory.create = jest.fn().mockRejectedValue(new Error('Simulated history failure'));

    try {
      await expect(
        kpiService.updateKpi(
          kpi._id,
          {
            currentValue: 80,
            description: 'Attempted Added Description',
          },
          testAdmin
        )
      ).rejects.toMatchObject({
        statusCode: 500,
        message: 'Failed to record KPI history; update rolled back',
      });

      const reverted = await Kpi.findById(kpi._id);
      expect(reverted.currentValue).toBe(50);
      expect(reverted.description).toBe('');
    } finally {
      KpiHistory.create = originalCreate;
    }
  });

  test('reports rollback failure if compensating rollback itself fails during update', async () => {
    const kpi = await kpiService.createKpi(
      {
        name: 'Double Fault KPI',
        code: 'OPS-DF',
        department: departmentId,
        target: 100,
        currentValue: 50,
      },
      testAdmin
    );

    const originalHistoryCreate = KpiHistory.create;
    const originalFindByIdAndUpdate = Kpi.findByIdAndUpdate;

    KpiHistory.create = jest.fn().mockRejectedValue(new Error('History write failed'));

    let callCount = 0;
    Kpi.findByIdAndUpdate = jest.fn().mockImplementation((...args) => {
      callCount += 1;
      if (callCount === 1) {
        // Initial update succeeds
        return originalFindByIdAndUpdate.apply(Kpi, args);
      }
      // Compensating rollback update fails
      return Promise.reject(new Error('Rollback DB network error'));
    });

    try {
      await expect(
        kpiService.updateKpi(kpi._id, { currentValue: 90 }, testAdmin)
      ).rejects.toMatchObject({
        statusCode: 500,
        message: expect.stringContaining('compensating rollback failed'),
      });
    } finally {
      KpiHistory.create = originalHistoryCreate;
      Kpi.findByIdAndUpdate = originalFindByIdAndUpdate;
    }
  });

  test('reports deletion cleanup failure explicitly when history delete fails', async () => {
    const kpi = await kpiService.createKpi(
      {
        name: 'Cleanup Fault KPI',
        code: 'OPS-CF',
        department: departmentId,
        target: 100,
        currentValue: 50,
      },
      testAdmin
    );

    const originalDeleteMany = KpiHistory.deleteMany;
    KpiHistory.deleteMany = jest.fn().mockRejectedValue(new Error('Cleanup DB failure'));

    try {
      await expect(kpiService.deleteKpi(kpi._id)).rejects.toMatchObject({
        statusCode: 500,
        message: expect.stringContaining('cascading history cleanup encountered an error'),
      });

      // KPI itself was deleted
      const deletedKpi = await Kpi.findById(kpi._id);
      expect(deletedKpi).toBeNull();
    } finally {
      KpiHistory.deleteMany = originalDeleteMany;
    }
  });

  test('safeAbortTransaction only aborts if transaction is active and does not mask errors', async () => {
    const inactiveSession = {
      inTransaction: jest.fn().mockReturnValue(false),
      abortTransaction: jest.fn(),
    };
    await kpiService.safeAbortTransaction(inactiveSession);
    expect(inactiveSession.abortTransaction).not.toHaveBeenCalled();

    const activeSession = {
      inTransaction: jest.fn().mockReturnValue(true),
      abortTransaction: jest.fn().mockRejectedValue(new Error('Abort failed')),
    };
    // Should not throw and catch abort failure internally
    await expect(kpiService.safeAbortTransaction(activeSession)).resolves.not.toThrow();
    expect(activeSession.abortTransaction).toHaveBeenCalled();
  });
});
