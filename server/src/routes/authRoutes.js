// Authentication routes for register, login, and user profile.

import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import {
  registerRules,
  loginRules,
  bootstrapAdminRules,
  updateUserRoleRules,
} from '../validators/authValidator.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  loginLimiter,
  registerLimiter,
  bootstrapAdminLimiter,
} from '../middleware/rateLimiter.js';

const router = Router();

router.post('/register', registerLimiter, registerRules, validateRequest, authController.register);
router.post('/login', loginLimiter, loginRules, validateRequest, authController.login);
router.get('/me', authenticate, authController.getMe);
router.post('/bootstrap-admin', bootstrapAdminLimiter, bootstrapAdminRules, validateRequest, authController.bootstrapAdmin);
router.patch('/users/:id/role', authenticate, authorize('admin'), updateUserRoleRules, validateRequest, authController.updateUserRole);

export default router;
