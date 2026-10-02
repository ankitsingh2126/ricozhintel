// Runs after express-validator rules on a route.
// If any rule failed, responds 400 with the list of errors.
// Otherwise, calls next() so the controller runs.

import { validationResult } from 'express-validator';
import { sendError } from '../utils/apiResponse.js';

export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }

  const details = errors.array().map((e) => ({
    field: e.path,
    message: e.msg,
  }));

  return sendError(res, {
    status: 400,
    code: 'VALIDATION_ERROR',
    message: 'Request validation failed',
    details,
  });
};
