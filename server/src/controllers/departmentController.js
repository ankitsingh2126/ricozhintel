// Department controller.
// Handles HTTP concerns: reading req, calling service, sending response.
// Any error thrown here is caught by the global error handler in app.js.

import * as departmentService from '../services/departmentService.js';
import { sendSuccess } from '../utils/apiResponse.js';

// GET /api/v1/departments
export const getAllDepartments = async (req, res, next) => {
  try {
    const { search, page, limit } = req.query;

    const { items, meta } = await departmentService.listDepartments({
      search,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });

    return sendSuccess(res, items, meta);
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/departments/:id
export const getDepartment = async (req, res, next) => {
  try {
    const department = await departmentService.getDepartmentById(req.params.id);
    return sendSuccess(res, department);
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/departments
export const createDepartment = async (req, res, next) => {
  try {
    const department = await departmentService.createDepartment(req.body);
    return sendSuccess(res, department, undefined, 201);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/departments/:id
export const updateDepartment = async (req, res, next) => {
  try {
    const department = await departmentService.updateDepartment(req.params.id, req.body);
    return sendSuccess(res, department);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/v1/departments/:id
export const deleteDepartment = async (req, res, next) => {
  try {
    await departmentService.deleteDepartment(req.params.id);
    return sendSuccess(res, { message: 'Department deleted' });
  } catch (err) {
    next(err);
  }
};
