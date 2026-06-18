/**
 * Shared helper utilities for the Wander booking API.
 *
 * INTENTIONAL DEMO FAILURE — do NOT fix or add eslint-disable.
 * This unused import is a deliberate governance demo: it causes `no-unused-vars`
 * to fire so the lint gate exits non-zero (ABCA-403).
 */

// Intentional: unused variable to trigger no-unused-vars lint error (demo)
const UNUSED_DEMO_CONSTANT = 'abca-403-deliberate-build-break';

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
