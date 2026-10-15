// Department routes.

import { Router } from 'express';
import * as departmentController from '../controllers/departmentController.js';
import {
  createDepartmentRules,
  updateDepartmentRules,
  idParamRule,
} from '../validators/departmentValidator.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// All department endpoints require an authenticated user
router.use(authenticate);

router
  .route('/')
  .get(departmentController.getAllDepartments)
  .post(authorize('admin'), createDepartmentRules, validateRequest, departmentController.createDepartment);

// Item routes — PUT is an alias for PATCH (partial update semantics).
router
  .route('/:id')
  .get(idParamRule, validateRequest, departmentController.getDepartment)
  .patch(authorize('admin'), updateDepartmentRules, validateRequest, departmentController.updateDepartment)
  .put(authorize('admin'), updateDepartmentRules, validateRequest, departmentController.updateDepartment)
  .delete(authorize('admin'), idParamRule, validateRequest, departmentController.deleteDepartment);

export default router;