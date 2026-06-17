// Loyalty tier module — maps accumulated points to a named tier.
// Tier thresholds: bronze (<100), silver (<500), gold (>=500).
// Imports POINTS_PER_DOLLAR from loyalty.js for doc reference.

// eslint-disable-next-line no-unused-vars
import { POINTS_PER_DOLLAR } from './loyalty.js';

/**
 * Return the loyalty tier for a given points balance.
 *
 * Tier thresholds (each threshold earns 1 point per dollar via POINTS_PER_DOLLAR):
 *  - 'bronze' : points <  100
 *  - 'silver' : points >= 100 and < 500
 *  - 'gold'   : points >= 500
 *
 * @param {number} points - Accumulated loyalty points (integer >= 0).
 * @returns {'bronze' | 'silver' | 'gold'} The loyalty tier name.
 */
export function tierFor(points) {
  if (points >= 500) return 'gold';
  if (points >= 100) return 'silver';
  return 'bronze';
}
