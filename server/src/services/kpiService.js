// KPI service.
// Business logic only. Controllers handle HTTP; this handles the data layer.

import mongoose from 'mongoose';
import { Kpi } from '../models/Kpi.js';
import { Department } from '../models/Department.js';
import { KpiHistory } from '../models/KpiHistory.js';
import { ApiError } from '../utils/ApiError.js';
import { withAchievement, calculateAchievement } from '../utils/achievement.js';

// Wrap a KPI with a computed `achievement` field.
const decorate = (kpi) => withAchievement(kpi);
const decorateList = (kpis) => kpis.map(decorate);

// Translate duplicate-key errors from Mongo into a clean ApiError.
const handleDuplicate = (err) => {
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    throw ApiError.conflict(`KPI ${field} already exists`);
  }
  throw err;
};

// ---- read ---------------------------------------------------------------

export const listKpis = async ({
  department,
  status,
  period,
  search,
  page = 1,
  limit = 20,
} = {}) => {
  const query = {};
  if (department) query.department = department;
  if (status) query.status = status;
  if (period) query.period = period;
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Kpi.find(query)
      .populate('department', 'name code')
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit),
    Kpi.countDocuments(query),
  ]);

  return {
    items: decorateList(items),
    meta: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};

export const getKpiById = async (id) => {
  const kpi = await Kpi.findById(id).populate('department', 'name code');
  if (!kpi) {
    throw ApiError.notFound('KPI not found');
  }
  return decorate(kpi);
};

// Check if the current MongoDB connection topology supports multi-document transactions.
// Replica sets (such as MongoDB Atlas) support transactions; standalone instances (such as test runners) do not.
export const supportsTransactions = () => {
  const topology = mongoose.connection.client?.topology?.description;
  if (!topology) return false;
  const type = topology.type;
  return (
    type === 'ReplicaSetWithPrimary' ||
    type === 'ReplicaSetNoPrimary' ||
    type === 'Sharded' ||
    Boolean(topology.setName)
  );
};

// Safely abort a transaction without letting abort errors mask the original operational error
export const safeAbortTransaction = async (session) => {
  if (session && typeof session.inTransaction === 'function' && session.inTransaction()) {
    try {
      await session.abortTransaction();
    } catch (abortErr) {
      console.error('[db] Error while aborting transaction:', abortErr.message);
    }
  }
};

// ---- write --------------------------------------------------------------

export const createKpi = async (payload, user = null) => {
  const { note, ...kpiData } = payload;

  const dept = await Department.findById(kpiData.department);
  if (!dept) {
    throw ApiError.badRequest('Referenced department does not exist');
  }

  const baselineHistoryData = (kpiId, kpiDoc) => ({
    kpi: kpiId,
    previousValue: 0,
    newValue: kpiDoc.currentValue ?? 0,
    target: kpiDoc.target,
    status: kpiDoc.status || 'on_track',
    changedBy: user?._id || null,
    changedByName: user?.name || 'System',
    note: note ? String(note).trim() : 'Initial baseline',
    changeType: 'initial',
  });

  if (supportsTransactions()) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const [kpi] = await Kpi.create([kpiData], { session });
      await KpiHistory.create([baselineHistoryData(kpi._id, kpi)], { session });
      await session.commitTransaction();
      await kpi.populate('department', 'name code');
      return decorate(kpi);
    } catch (err) {
      await safeAbortTransaction(session);
      handleDuplicate(err);
    } finally {
      await session.endSession();
    }
  }

  // Standalone fallback with compensating rollback
  let kpi;
  try {
    kpi = await Kpi.create(kpiData);
  } catch (err) {
    handleDuplicate(err);
  }

  try {
    await KpiHistory.create(baselineHistoryData(kpi._id, kpi));
  } catch (historyErr) {
    let rollbackErr = null;
    try {
      await Kpi.findByIdAndDelete(kpi._id);
    } catch (rbErr) {
      rollbackErr = rbErr;
      console.error(
        `[db] Critical: Failed to delete KPI ${kpi._id} after initial history write failure:`,
        rbErr.message
      );
    }

    if (rollbackErr) {
      const compositeError = ApiError.internal(
        `Failed to record initial KPI history (${historyErr.message}) and compensating rollback failed (${rollbackErr.message})`
      );
      compositeError.originalError = historyErr;
      compositeError.rollbackError = rollbackErr;
      throw compositeError;
    }

    const error = ApiError.internal(
      'Failed to record initial KPI history; creation rolled back'
    );
    error.originalError = historyErr;
    throw error;
  }

  await kpi.populate('department', 'name code');
  return decorate(kpi);
};

export const updateKpi = async (id, payload, user = null) => {
  const { note, ...kpiData } = payload;

  if (kpiData.department) {
    const dept = await Department.findById(kpiData.department);
    if (!dept) {
      throw ApiError.badRequest('Referenced department does not exist');
    }
  }

  const existingKpi = await Kpi.findById(id);
  if (!existingKpi) {
    throw ApiError.notFound('KPI not found');
  }

  const isValueChanging =
    kpiData.currentValue !== undefined &&
    Number(kpiData.currentValue) !== existingKpi.currentValue;

  if (!isValueChanging) {
    // Metadata-only edit: no history record created
    try {
      const kpi = await Kpi.findByIdAndUpdate(id, kpiData, {
        new: true,
        runValidators: true,
      }).populate('department', 'name code');
      return decorate(kpi);
    } catch (err) {
      handleDuplicate(err);
    }
  }

  // Value is changing: record history alongside KPI update
  const newTarget = kpiData.target !== undefined ? Number(kpiData.target) : existingKpi.target;
  const newStatus = kpiData.status || existingKpi.status;
  const historyData = {
    kpi: id,
    previousValue: existingKpi.currentValue,
    newValue: Number(kpiData.currentValue),
    target: newTarget,
    status: newStatus,
    changedBy: user?._id || null,
    changedByName: user?.name || 'System',
    note: note ? String(note).trim() : '',
    changeType: 'value_update',
  };

  if (supportsTransactions()) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const updated = await Kpi.findByIdAndUpdate(id, kpiData, {
        new: true,
        runValidators: true,
        session,
      }).populate('department', 'name code');

      await KpiHistory.create([historyData], { session });
      await session.commitTransaction();
      return decorate(updated);
    } catch (err) {
      await safeAbortTransaction(session);
      handleDuplicate(err);
    } finally {
      await session.endSession();
    }
  }

  // Standalone fallback with compensating rollback
  let updated;
  try {
    updated = await Kpi.findByIdAndUpdate(id, kpiData, {
      new: true,
      runValidators: true,
    }).populate('department', 'name code');
  } catch (err) {
    handleDuplicate(err);
  }

  try {
    await KpiHistory.create(historyData);
  } catch (historyErr) {
    // Safe, explicit rollback: restore every field modified by kpiData
    const rollbackData = {};
    const unsetData = {};
    for (const key of Object.keys(kpiData)) {
      if (existingKpi[key] !== undefined) {
        rollbackData[key] = existingKpi[key];
      } else {
        unsetData[key] = 1;
      }
    }
    const rollbackUpdate = { ...rollbackData };
    if (Object.keys(unsetData).length > 0) {
      rollbackUpdate.$unset = unsetData;
    }

    let rollbackErr = null;
    try {
      await Kpi.findByIdAndUpdate(id, rollbackUpdate);
    } catch (rbErr) {
      rollbackErr = rbErr;
      console.error(
        `[db] Critical: Failed to rollback KPI ${id} after history write failure:`,
        rbErr.message
      );
    }

    if (rollbackErr) {
      const compositeError = ApiError.internal(
        `Failed to record KPI history (${historyErr.message}) and compensating rollback failed (${rollbackErr.message})`
      );
      compositeError.originalError = historyErr;
      compositeError.rollbackError = rollbackErr;
      throw compositeError;
    }

    const error = ApiError.internal('Failed to record KPI history; update rolled back');
    error.originalError = historyErr;
    throw error;
  }

  return decorate(updated);
};

export const deleteKpi = async (id) => {
  if (supportsTransactions()) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const kpi = await Kpi.findByIdAndDelete(id, { session });
      if (!kpi) {
        throw ApiError.notFound('KPI not found');
      }
      await KpiHistory.deleteMany({ kpi: id }, { session });
      await session.commitTransaction();
      return kpi;
    } catch (err) {
      await safeAbortTransaction(session);
      throw err;
    } finally {
      await session.endSession();
    }
  }

  const kpi = await Kpi.findByIdAndDelete(id);
  if (!kpi) {
    throw ApiError.notFound('KPI not found');
  }

  try {
    await KpiHistory.deleteMany({ kpi: id });
  } catch (cleanupErr) {
    console.error(
      `[db] Warning: KPI ${id} was deleted, but cascading history cleanup failed:`,
      cleanupErr.message
    );
    const error = ApiError.internal(
      `KPI was deleted, but cascading history cleanup encountered an error: ${cleanupErr.message}`
    );
    error.kpi = kpi;
    error.originalError = cleanupErr;
    throw error;
  }

  return kpi;
};

export const getKpiHistory = async (kpiId, { page = 1, limit = 20 } = {}) => {
  const kpi = await Kpi.findById(kpiId);
  if (!kpi) {
    throw ApiError.notFound('KPI not found');
  }

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    KpiHistory.find({ kpi: kpiId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('changedBy', 'name email role'),
    KpiHistory.countDocuments({ kpi: kpiId }),
  ]);

  return {
    items,
    meta: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};

// ---- summary ------------------------------------------------------------

// Helper to build match filter from query parameters for summary aggregations
const buildSummaryFilter = ({ department, status, period } = {}) => {
  const filter = {};
  if (department) {
    // If it's a valid 24-char ObjectId string, convert to ObjectId instance
    if (mongoose.Types.ObjectId.isValid(department)) {
      filter.department = new mongoose.Types.ObjectId(department);
    } else {
      filter.department = department;
    }
  }
  if (status) filter.status = status;
  if (period) filter.period = period;
  return filter;
};

// Global summary for the top KPI cards on the dashboard.
export const getKpiSummary = async ({ department, status, period } = {}) => {
  const matchFilter = buildSummaryFilter({ department, status, period });

  const [total, byStatus, progressAgg] = await Promise.all([
    Kpi.countDocuments(matchFilter),
    Kpi.aggregate([
      ...(Object.keys(matchFilter).length > 0 ? [{ $match: matchFilter }] : []),
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Kpi.aggregate([
      ...(Object.keys(matchFilter).length > 0 ? [{ $match: matchFilter }] : []),
      {
        $group: {
          _id: null,
          avgProgress: {
            $avg: {
              $cond: [
                { $gt: ['$target', 0] },
                { $multiply: [{ $divide: ['$currentValue', '$target'] }, 100] },
                null,
              ],
            },
          },
        },
      },
    ]),
  ]);

  const statusCounts = { on_track: 0, at_risk: 0, off_track: 0, completed: 0 };
  byStatus.forEach((row) => {
    if (statusCounts[row._id] !== undefined) statusCounts[row._id] = row.count;
  });

  const avgProgress = progressAgg[0]?.avgProgress
    ? Math.round(progressAgg[0].avgProgress)
    : 0;

  return { total, byStatus: statusCounts, avgProgress };
};

// Department-wise summary. One row per department that has KPIs.
// Individual KPI achievements are computed per rule, and their average gives the
// department's avgAchievement without incorrectly summing mismatched units (e.g. USD + % + count).
export const getSummaryByDepartment = async ({ department, status, period } = {}) => {
  const matchFilter = buildSummaryFilter({ department, status, period });

  const rows = await Kpi.aggregate([
    ...(Object.keys(matchFilter).length > 0 ? [{ $match: matchFilter }] : []),
    {
      $group: {
        _id: '$department',
        total: { $sum: 1 },
        on_track: { $sum: { $cond: [{ $eq: ['$status', 'on_track'] }, 1, 0] } },
        at_risk: { $sum: { $cond: [{ $eq: ['$status', 'at_risk'] }, 1, 0] } },
        off_track: { $sum: { $cond: [{ $eq: ['$status', 'off_track'] }, 1, 0] } },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        totalTarget: { $sum: '$target' },
        totalActual: { $sum: '$currentValue' },
        kpis: {
          $push: {
            currentValue: '$currentValue',
            target: '$target',
            statusRule: '$statusRule',
          },
        },
      },
    },
  ]);

  const deptIds = rows.map((r) => r._id);
  const departments = await Department.find({ _id: { $in: deptIds } }).select('name code');
  const deptMap = new Map(departments.map((d) => [String(d._id), d]));

  return rows
    .map((r) => {
      const dept = deptMap.get(String(r._id));

      // Calculate achievement for each KPI in the department
      const validAchievements = (r.kpis || [])
        .map((k) => calculateAchievement(k.currentValue, k.target, k.statusRule))
        .filter((val) => val !== null && Number.isFinite(val));

      const avgAchievement =
        validAchievements.length > 0
          ? Math.round(
              validAchievements.reduce((sum, val) => sum + val, 0) / validAchievements.length
            )
          : null;

      return {
        department: dept
          ? { _id: dept._id, name: dept.name, code: dept.code }
          : { _id: r._id, name: 'Unknown', code: '—' },
        total: r.total,
        byStatus: {
          on_track: r.on_track,
          at_risk: r.at_risk,
          off_track: r.off_track,
          completed: r.completed,
        },
        totalTarget: r.totalTarget,
        totalActual: r.totalActual,
        avgAchievement,
      };
    })
    .sort((a, b) => a.department.name.localeCompare(b.department.name));
};