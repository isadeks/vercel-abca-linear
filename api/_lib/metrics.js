/**
 * Metrics service — returns key dashboard counts and totals for a set of items,
 * optionally filtered to a date window (based on each item's createdAt).
 *
 * @param {Array<{id: string, status: string, createdAt: string, completedAt?: string}>} items
 *   The full list of items (tasks/issues) to summarise.
 * @param {Date|string|null} [from]
 *   Inclusive lower bound on createdAt. Items created before this date are
 *   excluded from all counts. Pass null or omit to apply no lower bound.
 * @param {Date|string|null} [to]
 *   Inclusive upper bound on createdAt. Items created after this date are
 *   excluded from all counts. Pass null or omit to apply no upper bound.
 * @returns {{ total: number, open: number, completed: number, avgCompletionTime: number|null }}
 *   - total: number of items in the window
 *   - open: items with status === 'open'
 *   - completed: items with status === 'completed' and a completedAt value
 *   - avgCompletionTime: mean milliseconds from createdAt to completedAt for
 *     completed items, or null when there are no completed items
 */
export function metrics(items, from = null, to = null) {
  if (!Array.isArray(items)) {
    throw new TypeError('items must be an array');
  }

  const fromDate = from !== null && from !== undefined ? new Date(from) : null;
  const toDate = to !== null && to !== undefined ? new Date(to) : null;

  if (fromDate !== null && isNaN(fromDate.getTime())) {
    throw new TypeError('from must be a valid date');
  }
  if (toDate !== null && isNaN(toDate.getTime())) {
    throw new TypeError('to must be a valid date');
  }
  if (fromDate !== null && toDate !== null && fromDate > toDate) {
    throw new RangeError('from must not be later than to');
  }

  let scoped = items;
  if (fromDate !== null || toDate !== null) {
    scoped = items.filter((item) => {
      const created = new Date(item.createdAt);
      if (fromDate !== null && created < fromDate) return false;
      if (toDate !== null && created > toDate) return false;
      return true;
    });
  }

  const open = scoped.filter((item) => item.status === 'open').length;
  const completedItems = scoped.filter(
    (item) => item.status === 'completed' && item.completedAt,
  );

  let avgCompletionTime = null;
  if (completedItems.length > 0) {
    const totalMs = completedItems.reduce((sum, item) => {
      return sum + (new Date(item.completedAt) - new Date(item.createdAt));
    }, 0);
    avgCompletionTime = totalMs / completedItems.length;
  }

  return {
    total: scoped.length,
    open,
    completed: completedItems.length,
    avgCompletionTime,
  };
}
