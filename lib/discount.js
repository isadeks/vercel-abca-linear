/**
 * Apply a percentage discount to a price.
 * @param {number} price - Original price
 * @param {number} pct   - Discount percentage (e.g. 10 means 10%)
 * @returns {number}     - Discounted price rounded to 2 decimal places
 */
export function applyDiscount(price, pct) {
  return Math.round((price - (price * pct) / 100) * 100) / 100;
}

/**
 * Apply a percentage discount to a price and return a formatted dollar string.
 *
 * @param {number} price - The original price.
 * @param {number} pct   - The discount percentage (0–100).
 * @returns {string}     - Formatted price string, e.g. "$90.00".
 */
export function applyDiscountString(price, pct) {
  const discounted = price * (1 - pct / 100);
  return `$${discounted.toFixed(2)}`;
}
