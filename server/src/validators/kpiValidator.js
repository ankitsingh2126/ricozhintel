// Request validation rules for KPI endpoints.
// Code field allows letters, digits, hyphens, and underscores (e.g. SAL-REV).

import { body, param } from 'express-validator';

const CODE_REGEX = /^[A-Za-z0-9_-]+$/;

const nameRule = (optional = false) => {
  const rule = body('name').trim();
  if (optional) rule.optional();
  else rule.notEmpty().withMessage('name is required');
  return rule.isLength({ min: 2, max: 120 }).withMessage('name must be 2-120 characters');
};

const codeRule = (optional = false) => {
  const rule = body('code').trim();
  if (optional) rule.optional();
  else rule.notEmpty().withMessage('code is required');
  return rule
    .isLength({ min: 2, max: 20 }).withMessage('code must be 2-20 characters')
    .matches(CODE_REGEX).withMessage('code may only contain letters, numbers, hyphens, and underscores');
};

const departmentRule = (optional = false) => {
  const rule = body('department');
  if (optional) rule.optional();
  else rule.notEmpty().withMessage('department is required');
  return rule.isMongoId().withMessage('department must be a valid id');
};

const optionalRules = () => [
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
  body('owner')
    .optional()
    .isLength({ max: 120 }).withMessage('owner must be at most 120 characters'),
  body('statusRule')
    .optional()
    .isIn(['higher_is_better', 'lower_is_better'])
    .withMessage('statusRule must be higher_is_better or lower_is_better'),
];

export const createKpiRules = [
  nameRule(false),
  codeRule(false),
  departmentRule(false),
  body('target')
    .notEmpty().withMessage('target is required')
    .isFloat({ min: 0 }).withMessage('target must be a non-negative number'),
  ...optionalRules(),
];

export const updateKpiRules = [
  param('id').isMongoId().withMessage('invalid kpi id'),
  nameRule(true),
  codeRule(true),
  departmentRule(true),
  ...optionalRules(),
];

export const kpiIdParamRule = [
  param('id').isMongoId().withMessage('invalid kpi id'),
];