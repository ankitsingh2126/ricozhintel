// Compatibility aliases.
//
// The canonical API lives under /api/v1/*.
// This router exposes a small set of endpoints directly under /api/* so
// clients following the original spec (which used /api/health) still work.

import { Router } from 'express';
import mongoose from 'mongoose';
import { sendSuccess } from '../utils/apiResponse.js';

const router = Router();

// GET /api/health — mirrors /api/v1/health
router.get('/health', (req, res) => {
  const dbStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const dbState = dbStates[mongoose.connection.readyState] || 'unknown';

  return sendSuccess(res, {
    service: 'ricozhintel-api',
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    db: dbState,
    alias: true,
  });
});

export default router;