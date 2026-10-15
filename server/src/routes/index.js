// Central router.
// Canonical API lives under /api/v1/*.
// The alias router exposes /api/health for spec compatibility.

import { Router } from 'express';
import healthRoutes from './healthRoutes.js';
import departmentRoutes from './departmentRoutes.js';
import kpiRoutes from './kpiRoutes.js';
import authRoutes from './authRoutes.js';
import aliasRoutes from './aliasRoutes.js';

const router = Router();

// Canonical API
router.use('/v1/health', healthRoutes);
router.use('/v1/auth', authRoutes);
router.use('/v1/departments', departmentRoutes);
router.use('/v1/kpis', kpiRoutes);

// Compatibility aliases (mounted under /api by app.js)
router.use('/', aliasRoutes);

export default router;