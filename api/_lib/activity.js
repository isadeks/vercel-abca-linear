/**
 * Activity service — returns dashboard activity events, optionally filtered
 * to a date window and sorted newest-first.
 *
 * @param {Array<{id: string, actor: string, action: string, subject?: string, timestamp: string}>} events
 *   The full list of activity events to filter and sort.
 * @param {Date|string|null} [from]
 *   Inclusive lower bound. Events whose timestamp is before this date are
 *   excluded. Pass null or omit to apply no lower bound.
 * @param {Date|string|null} [to]
 *   Inclusive upper bound. Events whose timestamp is after this date are
 *   excluded. Pass null or omit to apply no upper bound.
 * @returns {Array<{id: string, actor: string, action: string, subject?: string, timestamp: string}>}
 *   Filtered events sorted by timestamp descending (newest first).
 */
export function activity(events, from = null, to = null) {
  if (!Array.isArray(events)) {
    throw new TypeError('events must be an array');
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

  let result = events.slice();

  if (fromDate !== null || toDate !== null) {
    result = result.filter((event) => {
      const ts = new Date(event.timestamp);
      if (fromDate !== null && ts < fromDate) return false;
      if (toDate !== null && ts > toDate) return false;
      return true;
    });
  }

  result.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  return result;
}
