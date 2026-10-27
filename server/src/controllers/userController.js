// User management controller for administrative user operations.

import * as userService from '../services/userService.js';
import { sendSuccess } from '../utils/apiResponse.js';

// GET /api/v1/users
export const getUsers = async (req, res, next) => {
  try {
    const { search, role, status, page, limit } = req.query;
    const result = await userService.getUsers({ search, role, status, page, limit });
    return sendSuccess(res, result.items, result.meta);
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/users/:id
export const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(id);
    return sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/users
export const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, status } = req.body;
    const user = await userService.createUser({ name, email, password, role, status });
    return sendSuccess(res, user, undefined, 201);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/users/:id
export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email } = req.body;
    const user = await userService.updateUser(id, { name, email });
    return sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/users/:id/role
export const updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const user = await userService.updateUserRole(id, role, req.user?._id);
    return sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/users/:id/status
export const updateUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const user = await userService.updateUserStatus(id, status, req.user?._id);
    return sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
};
