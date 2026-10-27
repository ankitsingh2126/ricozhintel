// Administrative User Management routes.
// All endpoints require an authenticated user with the 'admin' role.

import { Router } from 'express';
import * as userController from '../controllers/userController.js';
import {
  listUsersRules,
  userIdParamRule,
  createUserRules,
  updateUserRules,
  updateUserRoleRules,
  updateUserStatusRules,
} from '../validators/userValidator.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// Restrict all user management endpoints to authenticated Administrators
router.use(authenticate, authorize('admin'));

router
  .route('/')
  .get(listUsersRules, validateRequest, userController.getUsers)
  .post(createUserRules, validateRequest, userController.createUser);

router
  .route('/:id')
  .get(userIdParamRule, validateRequest, userController.getUserById)
  .patch(updateUserRules, validateRequest, userController.updateUser);

router.patch(
  '/:id/role',
  updateUserRoleRules,
  validateRequest,
  userController.updateUserRole
);

router.patch(
  '/:id/status',
  updateUserStatusRules,
  validateRequest,
  userController.updateUserStatus
);

export default router;
