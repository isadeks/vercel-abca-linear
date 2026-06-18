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

/**
 * Calculates the number of whole nights between a check-in and check-out date.
 * Both arguments are accepted as ISO-8601 date strings (YYYY-MM-DD) or Date objects.
 * Returns 0 when check-out is not after check-in.
 * @param {string|Date} checkIn
 * @param {string|Date} checkOut
 * @returns {number}
 */
export function calculateNights(checkIn, checkOut) {
  const msPerDay = 1000 * 60 * 60 * 24;
  const inMs = new Date(checkIn).getTime();
  const outMs = new Date(checkOut).getTime();
  const nights = Math.floor((outMs - inMs) / msPerDay);
  return nights > 0 ? nights : 0;
}
