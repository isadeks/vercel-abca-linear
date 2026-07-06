/**
 * completion-count.js
 *
 * Returns the number of items completed within the inclusive date range
 * [from, to].  An item is considered completed when `status === 'completed'`
 * and `completedAt` falls within the window.
 *
 * @param {Array<{status: string, completedAt: string|Date|null}>} items
 * @param {string|Date} from  – range start (inclusive)
 * @param {string|Date} to    – range end   (inclusive)
 * @returns {number}
 */
export function completionCount(items, from, to) {
  if (!Array.isArray(items)) throw new TypeError('items must be an array');
  const start = new Date(from).getTime();
  const end = new Date(to).getTime();
  if (isNaN(start) || isNaN(end)) throw new RangeError('from and to must be valid dates');
  if (start > end) throw new RangeError('from must not be after to');

  return items.filter(item => {
    if (item.status !== 'completed' || item.completedAt === null || item.completedAt === undefined) return false;
    const t = new Date(item.completedAt).getTime();
    return t >= start && t <= end;
  }).length;
}
