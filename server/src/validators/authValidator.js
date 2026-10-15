// Request validation schemas for authentication routes.

import { body } from 'express-validator';

export const registerRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('name is required')
    .isLength({ min: 2, max: 100 }).withMessage('name must be 2-100 characters'),
  body('email')
    .trim()
    .notEmpty().withMessage('email is required')
    .isEmail().withMessage('please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('password is required')
    .isLength({ min: 6 }).withMessage('password must be at least 6 characters'),
  body('role')
    .optional()
    .isIn(['admin', 'viewer']).withMessage('role must be admin or viewer'),
];

export const loginRules = [
  body('email')
    .trim()
    .notEmpty().withMessage('email is required')
    .isEmail().withMessage('please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('password is required'),
];
