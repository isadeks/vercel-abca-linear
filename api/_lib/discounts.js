/**
 * @module discounts
 *
 * Pure domain module for discount-code logic.
 * No I/O, no side-effects — safe to import anywhere.
 *
 * Exports:
 *   - {@link validateCode} — returns `true` if a code is recognised.
 *   - {@link percentFor}   — returns the decimal discount fraction (e.g. `0.10`),
 *                            or `null` for an unrecognised code.
 *
 * Supported promo codes: SAVE1, SAVE2, SAVE3, SAVE5, SAVE10, SAVE15, SAVE20, SAVE25, SAVE30, SAVE50, SAVE99, WELCOME.
 * All lookups are case-insensitive.
 */

/** @type {Record<string, number>} */
const CODES = {
  SAVE1:  0.01,
  SAVE2:  0.02,
  SAVE3:  0.03,
  SAVE5:  0.05,
  SAVE10: 0.10,
  SAVE15: 0.15,
  SAVE20: 0.20,
  SAVE25: 0.25,
  SAVE30: 0.30,
  SAVE50: 0.50,
  SAVE99: 0.99,
  WELCOME: 0.15,
};

/**
 * Returns true when `code` is a recognised promo code (case-insensitive).
 *
 * @param {string} code
 * @returns {boolean}
 */
export function validateCode(code) {
  if (typeof code !== 'string') return false;
  return Object.prototype.hasOwnProperty.call(CODES, code.toUpperCase());
}

/**
 * Returns the decimal discount fraction for a recognised promo code, or null
 * for unknown codes.  Case-insensitive.
 *
 * @param {string} code
 * @returns {number|null}
 */
export function percentFor(code) {
  if (typeof code !== 'string') return null;
  const upper = code.toUpperCase();
  return Object.prototype.hasOwnProperty.call(CODES, upper)
    ? CODES[upper]
    : null;
}
