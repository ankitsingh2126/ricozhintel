// KPI service.
// Business logic only. Controllers handle HTTP; this handles the data layer.

import { Kpi } from '../models/Kpi.js';
import { Department } from '../models/Department.js';
import { ApiError } from '../utils/ApiError.js';

// Compute a progress percentage for a single KPI.
// Guard against divide-by-zero (target = 0 shouldn't happen, but be safe).
const computeProgress = (kpi) => {
  if (!kpi.target) return 0;
  return Math.round((kpi.currentValue / kpi.target) * 100);
};

// List with filters + pagination.
export const listKpis = async ({
  department,
  status,
  search,
  page = 1,
  limit = 20,
} = {}) => {
  const query = {};

  if (department) query.department = department;
  if (status) query.status = status;
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
    items,
    meta: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};

// Get one by id, populated.
export const getKpiById = async (id) => {
  const kpi = await Kpi.findById(id).populate('department', 'name code');
  if (!kpi) {
    throw ApiError.notFound('KPI not found');
  }
  return kpi;
};

// Create. Validates that the referenced department actually exists.
export const createKpi = async (payload) => {
  const dept = await Department.findById(payload.department);
  if (!dept) {
    throw ApiError.badRequest('Referenced department does not exist');
  }

  try {
    const kpi = await Kpi.create(payload);
    return await kpi.populate('department', 'name code');
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || 'field';
      throw ApiError.conflict(`KPI ${field} already exists`);
    }
    throw err;
  }
};

// Update. If department is being changed, verify the new one exists.
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
    return kpi;
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || 'field';
      throw ApiError.conflict(`KPI ${field} already exists`);
    }
    throw err;
  }
};

// Delete.
export const deleteKpi = async (id) => {
  const kpi = await Kpi.findByIdAndDelete(id);
  if (!kpi) {
    throw ApiError.notFound('KPI not found');
  }
  return kpi;
};

// Summary for the dashboard KPI cards.
// Returns counts by status + average progress across all KPIs.
export const getKpiSummary = async () => {
  const [total, byStatus, progressAgg] = await Promise.all([
    Kpi.countDocuments(),
    Kpi.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Kpi.aggregate([
      {
        $group: {
          _id: null,
          avgProgress: {
            $avg: {
              $cond: [
                { $gt: ['$target', 0] },
                { $multiply: [{ $divide: ['$currentValue', '$target'] }, 100] },
                0,
              ],
            },
          },
        },
      },
    ]),
  ]);

  // Flatten status counts into a simple object.
  const statusCounts = {
    on_track: 0,
    at_risk: 0,
    off_track: 0,
    completed: 0,
  };
  byStatus.forEach((row) => {
    if (statusCounts[row._id] !== undefined) {
      statusCounts[row._id] = row.count;
    }
  });

  const avgProgress = progressAgg[0]?.avgProgress
    ? Math.round(progressAgg[0].avgProgress)
    : 0;

  return {
    total,
    byStatus: statusCounts,
    avgProgress,
  };
};
