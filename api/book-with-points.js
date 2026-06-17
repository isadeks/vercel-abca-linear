// Booking endpoint that applies loyalty points.
// Computes points earned for a booking and the resulting tier.

import { pointsForBooking } from './_lib/loyalty.js';
import { tierFor } from './_lib/loyalty-tier.js';

/**
 * Handle a book-with-points request.
 *
 * Expects `req.body.priceCents` (integer >= 0).
 * Returns an object `{ points, tier }` where:
 *   - `points` is the whole loyalty points earned for the booking.
 *   - `tier`   is the loyalty tier name ('bronze' | 'silver' | 'gold').
 *
 * @param {{ body: { priceCents: number } }} req - Incoming request object.
 * @returns {{ points: number, tier: string }}
 */
export function handler(req) {
  const { priceCents } = req.body;
  const points = pointsForBooking(priceCents);
  const tier = tierFor(points);
  return { points, tier };
}
