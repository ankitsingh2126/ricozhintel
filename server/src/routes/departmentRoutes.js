// Department routes.

import { Router } from 'express';
import * as departmentController from '../controllers/departmentController.js';
import {
  createDepartmentRules,
  updateDepartmentRules,
  idParamRule,
} from '../validators/departmentValidator.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = Router();

router
  .route('/')
  .get(departmentController.getAllDepartments)
  .post(createDepartmentRules, validateRequest, departmentController.createDepartment);

// Item routes — PUT is an alias for PATCH (partial update semantics).
router
  .route('/:id')
  .get(idParamRule, validateRequest, departmentController.getDepartment)
  .patch(updateDepartmentRules, validateRequest, departmentController.updateDepartment)
  .put(updateDepartmentRules, validateRequest, departmentController.updateDepartment)
  .delete(idParamRule, validateRequest, departmentController.deleteDepartment);

export default router;