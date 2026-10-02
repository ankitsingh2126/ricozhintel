// Central error handler. Must be registered LAST in app.js.
// Express recognizes it as an error handler because it has 4 arguments.

import { env } from '../config/env.js';
import { sendError } from '../utils/apiResponse.js';

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  const status = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.isOperational ? err.message : 'Internal server error';

  if (!env.isProduction) {
    console.error(`[error] ${req.method} ${req.originalUrl}`);
    console.error(err);
  }

  return sendError(res, {
    status,
    code,
    message,
    details: err.details || null,
  });
};
