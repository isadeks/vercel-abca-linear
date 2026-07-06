/**
 * avg-completion-time.js
 *
 * Returns the mean number of milliseconds between `createdAt` and
 * `completedAt` across all completed items.  Returns `null` when no
 * completed items are present (avoids division-by-zero / misleading zeros).
 *
 * @param {Array<{status: string, createdAt: string|Date, completedAt: string|Date|null}>} items
 * @returns {number|null}
 */
export function avgCompletionTime(items) {
  if (!Array.isArray(items)) throw new TypeError('items must be an array');

  const completed = items.filter(
    item => item.status === 'completed' && item.completedAt !== null && item.completedAt !== undefined
  );

  if (completed.length === 0) return null;

  const totalMs = completed.reduce((sum, item) => {
    const elapsed =
      new Date(item.completedAt).getTime() - new Date(item.createdAt).getTime();
    return sum + elapsed;
  }, 0);

  return totalMs / completed.length;
}
