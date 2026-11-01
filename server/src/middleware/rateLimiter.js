// Targeted rate limiting middleware for sensitive endpoints and general API access.
// Built with express-rate-limit and integrated with Ricozhintel's standard error envelope.

import rateLimit from 'express-rate-limit';
import { sendError } from '../utils/apiResponse.js';

/**
 * Creates a standard rate limit handler returning HTTP 429 with Ricozhintel's error envelope.
 * @param {string} defaultMessage
 */
const createRateLimitHandler = (customMessage) => (req, res, _next, options) => {
  const message =
    customMessage ||
    (typeof options?.message === 'string' ? options.message : 'Too many requests, please try again later.');

  return sendError(res, {
    status: 429,
    code: 'TOO_MANY_REQUESTS',
    message,
  });
};

/**
 * General API rate limiter (120 requests / minute per IP).
 * Applied globally to /api in app.js.
 */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler('Too many requests, please try again later.'),
});

/**
 * Targeted rate limiter for user authentication (POST /api/v1/auth/login).
 * Enforces a 15-minute sliding window with a default limit of 10 attempts per IP.
 * Prevents automated credential stuffing and password guessing while accommodating legitimate retries.
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: () => (process.env.NODE_ENV === 'test' && process.env.TEST_RATE_LIMIT_LOGIN_MAX
    ? Number(process.env.TEST_RATE_LIMIT_LOGIN_MAX)
    : 10),
  message: 'Too many login attempts. Please try again in 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler('Too many login attempts. Please try again in 15 minutes.'),
});

/**
 * Targeted rate limiter for public user registration (POST /api/v1/auth/register).
 * Enforces a 15-minute sliding window with a default limit of 10 account creations per IP.
 * Mitigates mass automated account creation abuse.
 */
export const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: () => (process.env.NODE_ENV === 'test' && process.env.TEST_RATE_LIMIT_REGISTER_MAX
    ? Number(process.env.TEST_RATE_LIMIT_REGISTER_MAX)
    : 10),
  message: 'Too many account registration attempts. Please try again in 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler('Too many account registration attempts. Please try again in 15 minutes.'),
});

/**
 * Targeted rate limiter for initial administrator provisioning (POST /api/v1/auth/bootstrap-admin).
 * Enforces a 15-minute sliding window with a strict limit of 5 attempts per IP.
 * Protects the bootstrap-admin endpoint against brute-force attacks on the bootstrap secret.
 */
export const bootstrapAdminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: () => (process.env.NODE_ENV === 'test'
    ? (Number(process.env.TEST_RATE_LIMIT_BOOTSTRAP_MAX) || 20)
    : 5),
  message: 'Too many administrative bootstrap attempts. Please try again in 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler('Too many administrative bootstrap attempts. Please try again in 15 minutes.'),
});
