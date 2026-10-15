// KPI routes.
//
// IMPORTANT: /summary and /summary/by-department must be registered
// BEFORE /:id, otherwise Express treats them as ids and validation fails.

import { Router } from 'express';
import * as kpiController from '../controllers/kpiController.js';
import {
  createKpiRules,
  updateKpiRules,
  kpiIdParamRule,
} from '../validators/kpiValidator.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// All KPI endpoints require an authenticated user
router.use(authenticate);

// Static sub-routes first
router.get('/summary', kpiController.getSummary);
router.get('/summary/by-department', kpiController.getSummaryByDepartment);

// Collection routes
router
  .route('/')
  .get(kpiController.getAllKpis)
  .post(authorize('admin'), createKpiRules, validateRequest, kpiController.createKpi);

// Item routes — PUT is an alias for PATCH (partial update semantics).
router
  .route('/:id')
  .get(kpiIdParamRule, validateRequest, kpiController.getKpi)
  .patch(authorize('admin'), updateKpiRules, validateRequest, kpiController.updateKpi)
  .put(authorize('admin'), updateKpiRules, validateRequest, kpiController.updateKpi)
  .delete(authorize('admin'), kpiIdParamRule, validateRequest, kpiController.deleteKpi);

export default router;