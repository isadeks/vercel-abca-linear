/**
 * recent-activity.js
 *
 * Returns the most-recent team activity events, sorted newest-first and
 * capped at `limit` entries.
 *
 * Expected event shape:
 *   {
 *     id:        string,
 *     actor:     string,          // who performed the action
 *     action:    string,          // e.g. 'created', 'completed', 'commented'
 *     subject:   string,          // optional – what the action was on
 *     timestamp: string | Date,
 *   }
 *
 * @param {Array<{id: string, actor: string, action: string, timestamp: string|Date, subject?: string}>} events
 * @param {number} [limit=10]  – maximum number of events to return
 * @returns {Array}
 */
export function recentActivity(events, limit = 10) {
  if (!Array.isArray(events)) throw new TypeError('events must be an array');
  if (!Number.isInteger(limit) || limit < 0) {
    throw new RangeError('limit must be a non-negative integer');
  }

  return [...events]
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    .slice(0, limit);
}
