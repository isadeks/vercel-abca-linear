// Pure domain module for discount-code logic.
// No I/O, no side-effects — safe to import anywhere.

/** @type {Record<string, number>} */
const CODES = {
  SAVE10: 0.10,
  SAVE20: 0.20,
  SAVE30: 0.30,
  SAVE50: 0.50,
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
