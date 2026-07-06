/**
 * workload.js
 *
 * Returns each team member's current workload as a plain object mapping
 * assignee → count of open items assigned to them.
 *
 * Only open items are counted; items without an assignee (null / undefined)
 * are grouped under the key 'unassigned'.
 *
 * @param {Array<{assignee: string|null|undefined, status: string}>} items
 * @returns {Record<string, number>}
 */
export function workload(items) {
  if (!Array.isArray(items)) throw new TypeError('items must be an array');

  return items
    .filter(item => item.status === 'open')
    .reduce((acc, item) => {
      const key = item.assignee ?? 'unassigned';
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
}
