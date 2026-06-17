/**
 * Format an integer cent amount as a USD currency string.
 *
 * Divides `cents` by 100 and formats the result using the `en-US` locale
 * with `style: 'currency'` and `currency: 'USD'`, always producing exactly
 * two decimal places. Large values include comma separators.
 * Negative inputs produce a leading minus sign (e.g. `-$12.34`).
 *
 * @param {number} cents - Integer number of cents (positive, zero, or negative).
 *   E.g. `1234` represents $12.34, `-1234` represents -$12.34.
 * @returns {string} USD-formatted string with `$` prefix, two decimal places,
 *   and comma separators for thousands. Negative values are prefixed with `-`.
 *
 * @example
 * formatUsd(1234)    // => '$12.34'
 * @example
 * formatUsd(0)       // => '$0.00'
 * @example
 * formatUsd(100)     // => '$1.00'
 * @example
 * formatUsd(1)       // => '$0.01'
 * @example
 * formatUsd(123456)  // => '$1,234.56'
 * @example
 * formatUsd(-1234)   // => '-$12.34'
 */
export function formatUsd(cents) {
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
