// Authentication controller handling register, login, and profile fetching.

import * as authService from '../services/authService.js';
import { sendSuccess } from '../utils/apiResponse.js';

// POST /api/v1/auth/register
export const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    const result = await authService.register({ name, email, password, role });
    return sendSuccess(res, result, undefined, 201);
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
