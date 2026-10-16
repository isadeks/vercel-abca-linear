/**
 * Members service — returns a list of team members with their open and completed
 * item counts, optionally scoped to a date window (based on each item's createdAt).
 *
 * Items without an assignee are grouped under the key 'unassigned'.
 *
 * @param {Array<{id: string, status: string, assignee?: string, createdAt: string, completedAt?: string}>} items
 *   The full list of items (tasks/issues) to group by assignee.
 * @param {Date|string|null} [from]
 *   Inclusive lower bound on createdAt. Items created before this date are
 *   excluded. Pass null or omit to apply no lower bound.
 * @param {Date|string|null} [to]
 *   Inclusive upper bound on createdAt. Items created after this date are
 *   excluded. Pass null or omit to apply no upper bound.
 * @returns {Array<{member: string, open: number, completed: number}>}
 *   One entry per assignee (plus 'unassigned' when applicable), sorted
 *   alphabetically by member name.
 */
export function members(items, from = null, to = null) {
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

  /** @type {Record<string, {member: string, open: number, completed: number}>} */
  const map = {};
  for (const item of scoped) {
    const name = item.assignee ?? 'unassigned';
    if (!map[name]) {
      map[name] = { member: name, open: 0, completed: 0 };
    }
    if (item.status === 'open') map[name].open += 1;
    if (item.status === 'completed') map[name].completed += 1;
  }

  return Object.values(map).sort((a, b) => a.member.localeCompare(b.member));
}
