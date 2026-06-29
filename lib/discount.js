/**
 * Apply a percentage discount to a price.
 * @param {number} price - Original price
 * @param {number} pct   - Discount percentage (e.g. 10 means 10%)
 * @returns {number}     - Discounted price rounded to 2 decimal places
 */
export function applyDiscount(price, pct) {
  return Math.round((price - (price * pct) / 100) * 100) / 100;
}
