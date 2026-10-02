// Department service.
// Pure business logic — no req/res objects here.
// The controller calls these; the model talks to MongoDB.

import { Department } from '../models/Department.js';
import { ApiError } from '../utils/ApiError.js';

// List with optional search + pagination.
export const listDepartments = async ({ search, page = 1, limit = 20 } = {}) => {
  const query = {};

  if (search) {
    // Case-insensitive partial match on name or code.
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Department.find(query).sort({ name: 1 }).skip(skip).limit(limit),
    Department.countDocuments(query),
  ]);

  return {
    items,
    meta: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};

// Get one by id, throw 404 if not found.
export const getDepartmentById = async (id) => {
  const department = await Department.findById(id);
  if (!department) {
    throw ApiError.notFound('Department not found');
  }
  return department;
};

// Create a new department.
// Uniqueness of name/code is enforced by the schema; duplicate errors become 409.
export const createDepartment = async (payload) => {
  try {
    const department = await Department.create(payload);
    return department;
  } catch (err) {
    if (err.code === 11000) {
      // Duplicate key error from MongoDB
      const field = Object.keys(err.keyPattern || {})[0] || 'field';
      throw ApiError.conflict(`Department ${field} already exists`);
    }
    throw err;
  }
};

// Update by id. Throws 404 if not found.
export const updateDepartment = async (id, payload) => {
  try {
    const department = await Department.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    });
    if (!department) {
      throw ApiError.notFound('Department not found');
    }
    return department;
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || 'field';
      throw ApiError.conflict(`Department ${field} already exists`);
    }
    throw err;
  }
};

// Delete by id. Throws 404 if not found.
export const deleteDepartment = async (id) => {
  const department = await Department.findByIdAndDelete(id);
  if (!department) {
    throw ApiError.notFound('Department not found');
  }
  return department;
};
