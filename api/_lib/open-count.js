/**
 * open-count.js
 *
 * Returns the number of items whose status is 'open'.
 *
 * @param {Array<{status: string}>} items
 * @returns {number}
 */
export function openCount(items) {
  if (!Array.isArray(items)) throw new TypeError('items must be an array');
  return items.filter(item => item.status === 'open').length;
}
