// Request validation rules for department endpoints.
// Code field allows letters, digits, hyphens, and underscores.

import { body, param } from 'express-validator';

const CODE_REGEX = /^[A-Za-z0-9_-]+$/;

export const createDepartmentRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('name is required')
    .isLength({ min: 2, max: 80 }).withMessage('name must be 2-80 characters'),
  body('code')
    .trim()
    .notEmpty().withMessage('code is required')
    .isLength({ min: 2, max: 10 }).withMessage('code must be 2-10 characters')
    .matches(CODE_REGEX).withMessage('code may only contain letters, numbers, hyphens, and underscores'),
  body('head').optional().isString().withMessage('head must be a string'),
  body('description')
    .optional()
    .isLength({ max: 500 }).withMessage('description must be at most 500 characters'),
  body('status')
    .optional()
    .isIn(['active', 'inactive']).withMessage('status must be active or inactive'),
];

export const updateDepartmentRules = [
  param('id').isMongoId().withMessage('invalid department id'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 80 }).withMessage('name must be 2-80 characters'),
  body('code')
    .optional()
    .trim()
    .isLength({ min: 2, max: 10 }).withMessage('code must be 2-10 characters')
    .matches(CODE_REGEX).withMessage('code may only contain letters, numbers, hyphens, and underscores'),
  body('head').optional().isString().withMessage('head must be a string'),
  body('description')
    .optional()
    .isLength({ max: 500 }).withMessage('description must be at most 500 characters'),
  body('status')
    .optional()
    .isIn(['active', 'inactive']).withMessage('status must be active or inactive'),
];

export const idParamRule = [
  param('id').isMongoId().withMessage('invalid department id'),
];
