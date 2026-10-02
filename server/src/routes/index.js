// Central router. Mounts every feature's routes under /api/v1.

import { Router } from 'express';
import healthRoutes from './healthRoutes.js';
import departmentRoutes from './departmentRoutes.js';
import kpiRoutes from './kpiRoutes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/departments', departmentRoutes);
router.use('/kpis', kpiRoutes);

export default router;
