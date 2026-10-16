// Points-earning domain module.
// 1 point per whole dollar (floor). No external dependencies.

/** Number of points awarded per whole dollar spent. */
export const POINTS_PER_DOLLAR = 1;

/**
 * Calculate loyalty points earned for a booking.
 *
 * @param {number} priceCents - Booking price in cents (integer >= 0).
 * @returns {number} Whole loyalty points earned.
 */
export function pointsForBooking(priceCents) {
  return Math.floor(priceCents / 100) * POINTS_PER_DOLLAR;
}
