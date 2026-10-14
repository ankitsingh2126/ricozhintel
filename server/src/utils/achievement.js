// Achievement calculation. Single source of truth for "how far along is this KPI".
//
// The formula depends on the KPI's statusRule:
//   - higher_is_better (default): achievement = (actual / target) * 100
//   - lower_is_better:            achievement = (target / actual) * 100
//   - range:                      not implemented yet — returns null
//
// Safety rules (from the project brief):
//   - target = 0 → return null (undefined, not 0 or Infinity)
//   - missing values → return null
//   - non-numeric values → return null
//   - result is rounded to the nearest integer

export const calculateAchievement = (actual, target, statusRule = 'higher_is_better') => {
  const a = Number(actual);
  const t = Number(target);

  // Guard: missing or non-numeric
  if (!Number.isFinite(a) || !Number.isFinite(t)) return null;

  // Guard: zero or negative target for higher_is_better / lower_is_better
  if (t <= 0 && statusRule === 'higher_is_better') return null;

  // Guard: zero actual for lower_is_better (division by zero)
  if (a <= 0 && statusRule === 'lower_is_better') return null;

  let raw;
  switch (statusRule) {
    case 'lower_is_better':
      raw = (t / a) * 100;
      break;
    case 'higher_is_better':
    default:
      raw = (a / t) * 100;
      break;
  }

  if (!Number.isFinite(raw)) return null;
  return Math.round(raw);
};

// Attach an `achievement` field to a KPI document (plain object or Mongoose doc).
// Returns the KPI as a plain object with `achievement` set.
export const withAchievement = (kpi) => {
  if (!kpi) return kpi;
  const plain = typeof kpi.toObject === 'function' ? kpi.toObject() : kpi;
  return {
    ...plain,
    achievement: calculateAchievement(plain.currentValue, plain.target, plain.statusRule),
  };
};