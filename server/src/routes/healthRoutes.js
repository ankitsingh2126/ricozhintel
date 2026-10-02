// Health check endpoint.
// GET /api/v1/health
// Returns: service name, status, uptime, current time, and MongoDB connection state.

import { Router } from 'express';
import mongoose from 'mongoose';
import { sendSuccess } from '../utils/apiResponse.js';

const router = Router();

const DB_STATES = ['disconnected', 'connected', 'connecting', 'disconnecting'];

router.get('/', (req, res) => {
  const dbState = DB_STATES[mongoose.connection.readyState] || 'unknown';

  return sendSuccess(res, {
    service: 'ricozhintel-api',
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    db: dbState,
  });
});

export default router;
