// Request validation schemas for user management endpoints.

import { body, param, query } from 'express-validator';

export const listUsersRules = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
  query('role')
    .optional()
    .isIn(['admin', 'viewer']).withMessage('role must be admin or viewer'),
  query('status')
    .optional()
    .isIn(['active', 'inactive']).withMessage('status must be active or inactive'),
  query('search')
    .optional()
    .trim(),
];

export const userIdParamRule = [
  param('id')
    .isMongoId().withMessage('Invalid user id'),
];

export const createUserRules = [
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
  body('status')
    .optional()
    .isIn(['active', 'inactive']).withMessage('status must be active or inactive'),
];

export const updateUserRules = [
  param('id')
    .isMongoId().withMessage('Invalid user id'),
  body('name')
    .optional()
    .trim()
    .notEmpty().withMessage('name cannot be empty')
    .isLength({ min: 2, max: 100 }).withMessage('name must be 2-100 characters'),
  body('email')
    .optional()
    .trim()
    .notEmpty().withMessage('email cannot be empty')
    .isEmail().withMessage('please provide a valid email address')
    .normalizeEmail(),
];

export const updateUserRoleRules = [
  param('id')
    .isMongoId().withMessage('Invalid user id'),
  body('role')
    .notEmpty().withMessage('role is required')
    .isIn(['admin', 'viewer']).withMessage('role must be admin or viewer'),
];

export const updateUserStatusRules = [
  param('id')
    .isMongoId().withMessage('Invalid user id'),
  body('status')
    .notEmpty().withMessage('status is required')
    .isIn(['active', 'inactive']).withMessage('status must be active or inactive'),
];
