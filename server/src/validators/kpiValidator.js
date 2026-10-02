// Request validation rules for KPI endpoints.
// Code field allows letters, digits, hyphens, and underscores (e.g. SAL-REV).

import { body, param } from 'express-validator';

const CODE_REGEX = /^[A-Za-z0-9_-]+$/;

export const createKpiRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('name is required')
    .isLength({ min: 2, max: 120 }).withMessage('name must be 2-120 characters'),
  body('code')
    .trim()
    .notEmpty().withMessage('code is required')
    .isLength({ min: 2, max: 20 }).withMessage('code must be 2-20 characters')
    .matches(CODE_REGEX).withMessage('code may only contain letters, numbers, hyphens, and underscores'),
  body('department')
    .notEmpty().withMessage('department is required')
    .isMongoId().withMessage('department must be a valid id'),
  body('description')
    .optional()
    .isLength({ max: 500 }).withMessage('description must be at most 500 characters'),
  body('unit')
    .optional()
    .isLength({ max: 10 }).withMessage('unit must be at most 10 characters'),
  body('target')
    .notEmpty().withMessage('target is required')
    .isFloat({ min: 0 }).withMessage('target must be a non-negative number'),
  body('currentValue')
    .optional()
    .isFloat({ min: 0 }).withMessage('currentValue must be a non-negative number'),
  body('status')
    .optional()
    .isIn(['on_track', 'at_risk', 'off_track', 'completed'])
    .withMessage('status must be on_track, at_risk, off_track, or completed'),
  body('period')
    .optional()
    .isIn(['monthly', 'quarterly', 'yearly'])
    .withMessage('period must be monthly, quarterly, or yearly'),
];

export const updateKpiRules = [
  param('id').isMongoId().withMessage('invalid kpi id'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 120 }).withMessage('name must be 2-120 characters'),
  body('code')
    .optional()
    .trim()
    .isLength({ min: 2, max: 20 }).withMessage('code must be 2-20 characters')
    .matches(CODE_REGEX).withMessage('code may only contain letters, numbers, hyphens, and underscores'),
  body('department')
    .optional()
    .isMongoId().withMessage('department must be a valid id'),
  body('description')
    .optional()
    .isLength({ max: 500 }).withMessage('description must be at most 500 characters'),
  body('unit')
    .optional()
    .isLength({ max: 10 }).withMessage('unit must be at most 10 characters'),
  body('target')
    .optional()
    .isFloat({ min: 0 }).withMessage('target must be a non-negative number'),
  body('currentValue')
    .optional()
    .isFloat({ min: 0 }).withMessage('currentValue must be a non-negative number'),
  body('status')
    .optional()
    .isIn(['on_track', 'at_risk', 'off_track', 'completed'])
    .withMessage('status must be on_track, at_risk, off_track, or completed'),
  body('period')
    .optional()
    .isIn(['monthly', 'quarterly', 'yearly'])
    .withMessage('period must be monthly, quarterly, or yearly'),
];

export const kpiIdParamRule = [
  param('id').isMongoId().withMessage('invalid kpi id'),
];
