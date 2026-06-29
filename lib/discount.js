/**
 * Apply a percentage discount to a price and return a formatted dollar string.
 *
 * @param {number} price - The original price.
 * @param {number} pct   - The discount percentage (0–100).
 * @returns {string}     - Formatted price string, e.g. "$90.00".
 */
export function applyDiscount(price, pct) {
  const discounted = price * (1 - pct / 100);
  return `$${discounted.toFixed(2)}`;
}
