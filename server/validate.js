// Tiny checks shared by the routes. Request bodies come from outside,
// so we never trust their types before they reach SQL.

export function isPositiveInt(value) {
  return Number.isInteger(value) && value > 0;
}

export function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}
