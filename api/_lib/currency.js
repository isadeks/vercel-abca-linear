/**
 * Format an integer cent amount as a USD currency string.
 *
 * @param {number} cents - Integer number of cents (e.g. 1234)
 * @returns {string} Formatted USD string (e.g. "$12.34")
 */
export function formatUsd(cents) {
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
