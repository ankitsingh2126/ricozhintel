// KPI service.
// Business logic only. Controllers handle HTTP; this handles the data layer.

import { Kpi } from '../models/Kpi.js';
import { Department } from '../models/Department.js';
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

// ---- write --------------------------------------------------------------

export const createKpi = async (payload) => {
  const dept = await Department.findById(payload.department);
  if (!dept) {
    throw ApiError.badRequest('Referenced department does not exist');
  }

  try {
    const kpi = await Kpi.create(payload);
    await kpi.populate('department', 'name code');
    return decorate(kpi);
  } catch (err) {
    handleDuplicate(err);
  }
};

export const updateKpi = async (id, payload) => {
  if (payload.department) {
    const dept = await Department.findById(payload.department);
    if (!dept) {
      throw ApiError.badRequest('Referenced department does not exist');
    }
  }

  try {
    const kpi = await Kpi.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    }).populate('department', 'name code');

    if (!kpi) {
      throw ApiError.notFound('KPI not found');
    }
    return decorate(kpi);
  } catch (err) {
    handleDuplicate(err);
  }
};

export const deleteKpi = async (id) => {
  const kpi = await Kpi.findByIdAndDelete(id);
  if (!kpi) {
    throw ApiError.notFound('KPI not found');
  }
  return kpi;
};

// ---- summary ------------------------------------------------------------

// Global summary for the top KPI cards on the dashboard.
export const getKpiSummary = async () => {
  const [total, byStatus, progressAgg] = await Promise.all([
    Kpi.countDocuments(),
    Kpi.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Kpi.aggregate([
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
export const getSummaryByDepartment = async () => {
  const rows = await Kpi.aggregate([
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