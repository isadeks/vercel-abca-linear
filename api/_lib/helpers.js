/**
 * Shared helper utilities for the Wander booking API.
 */

/**
 * Formats a price value as a locale-aware currency string.
 * @param {number} amount
 * @param {string} [currency='USD']
 * @returns {string}
 */
export function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

/**
 * Returns true if the given value is a non-empty string.
 * @param {unknown} value
 * @returns {boolean}
 */
export function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}
