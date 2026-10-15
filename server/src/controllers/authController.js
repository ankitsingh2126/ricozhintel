// Authentication controller handling register, login, and profile fetching.

import * as authService from '../services/authService.js';
import { sendSuccess } from '../utils/apiResponse.js';

// POST /api/v1/auth/register
export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const result = await authService.register({ name, email, password });
    return sendSuccess(res, result, undefined, 201);
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/auth/bootstrap-admin
export const bootstrapAdmin = async (req, res, next) => {
  try {
    const { name, email, password, bootstrapSecret } = req.body;
    const result = await authService.bootstrapAdmin({ name, email, password, bootstrapSecret });
    return sendSuccess(res, result, undefined, 201);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/auth/users/:id/role
export const updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const user = await authService.updateUserRole(id, role);
    return sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/auth/login
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });
    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/auth/me
export const getMe = async (req, res, next) => {
  try {
    const user = await authService.getCurrentUser(req.user._id);
    return sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
};
