// Builds and configures the Express application.
// server.js calls createApp() and starts the HTTP listener.

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { env } from './config/env.js';
import apiRoutes from './routes/index.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

export const createApp = () => {
  const app = express();

  // 1. Trust first reverse proxy (e.g. Render, Cloudflare, load balancers)
  app.set('trust proxy', 1);

  // 2. Security headers
  app.use(helmet());

  // 3. CORS — allow configured frontend origin(s)
  const allowedOrigins = env.clientOrigin?.includes(',')
    ? env.clientOrigin.split(',').map((o) => o.trim())
    : env.clientOrigin;

  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
    })
  );

  // 3. Body parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // 4. Request logging (development only)
  if (!env.isProduction) {
    app.use(morgan('dev'));
  }

  // 5. Rate limiting on the API
  app.use(
    '/api',
    rateLimit({
      windowMs: 60 * 1000,
      max: 120,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  // 6. API routes — mounted at /api so both /api/v1/* and /api/health work.
  app.use('/api', apiRoutes);

  // 7. 404 handler — runs if no route matched above
  app.use(notFound);

  // 8. Error handler — MUST be last
  app.use(errorHandler);

  return app;
};