/**
 * Formats a price given in cents as a human-readable string.
 *
 * @param {number} cents - Amount in cents (e.g. 1000 = $10.00)
 * @returns {string} Formatted price string (e.g. "10 USD")
 */
export function formatPrice(cents) {
  const dollars = Math.floor(cents / 100);
  return `${dollars} USD`;
}
