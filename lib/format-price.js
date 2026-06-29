/**
 * Formats a price in cents as a US dollar string.
 * @param {number} cents - The price in cents (e.g. 1000 for $10.00)
 * @returns {string} Formatted USD string (e.g. "$10.00")
 */
export function formatPrice(cents) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}
