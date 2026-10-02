// KPI routes.
//
// IMPORTANT: /summary must be registered BEFORE /:id,
// otherwise Express treats "summary" as an id and validation fails.

import { Router } from 'express';
import * as kpiController from '../controllers/kpiController.js';
import {
  createKpiRules,
  updateKpiRules,
  kpiIdParamRule,
} from '../validators/kpiValidator.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = Router();

// Specific path first
router.get('/summary', kpiController.getSummary);

// Collection routes
router
  .route('/')
  .get(kpiController.getAllKpis)
  .post(createKpiRules, validateRequest, kpiController.createKpi);

// Item routes
router
  .route('/:id')
  .get(kpiIdParamRule, validateRequest, kpiController.getKpi)
  .patch(updateKpiRules, validateRequest, kpiController.updateKpi)
  .delete(kpiIdParamRule, validateRequest, kpiController.deleteKpi);

export default router;
