// Runs after all routes. If a request reaches here, no route matched.
// Sends a JSON 404 instead of Express's default HTML error page.

import { sendError } from '../utils/apiResponse.js';

export const notFound = (req, res) => {
  return sendError(res, {
    status: 404,
    code: 'NOT_FOUND',
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};
