// Custom error class so controllers/services can throw errors with an HTTP status code.
// The global error handler catches these and turns them into a JSON response.

export class ApiError extends Error {
  constructor(statusCode, message, code = 'ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, details = null) {
    return new ApiError(400, message, 'BAD_REQUEST', details);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, message, 'NOT_FOUND');
  }

  static conflict(message, details = null) {
    return new ApiError(409, message, 'CONFLICT', details);
  }

  static internal(message = 'Internal server error') {
    return new ApiError(500, message, 'INTERNAL_ERROR');
  }
}
