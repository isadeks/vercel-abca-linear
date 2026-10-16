/**
 * pricing.js — Trip pricing domain module for Wander destinations.
 *
 * Imports availability data from ./availability.js.
 * Pure functions, no I/O, no external dependencies.
 */

import { getAvailability, isRangeAvailable, nightsBetween } from './availability.js';

// Tax rate applied to the room subtotal.
const TAX_RATE = 0.12;

/**
 * Quote the total price for a trip.
 *
 * Computes the room subtotal by summing each night's nightlyRateUsd × roomsNeeded,
 * applies a 12% tax (rounded to the nearest cent), and returns a breakdown.
 *
 * Throws if the requested range is not available (any night has insufficient rooms).
 * Throws if destinationId is unknown or dates are invalid (delegated to availability.js).
 *
 * @param {string} destinationId
 * @param {string} startDate      ISO date string (first night, inclusive)
 * @param {string} endDate        ISO date string (checkout, exclusive)
 * @param {number} roomsNeeded    Number of rooms required each night
 * @returns {{ nights: number, roomSubtotalUsd: number, taxesUsd: number, totalUsd: number, currency: 'USD' }}
 */
export function quote(destinationId, startDate, endDate, roomsNeeded) {
  if (!isRangeAvailable(destinationId, startDate, endDate, roomsNeeded)) {
    throw new Error(
      `Range not available: "${destinationId}" from ${startDate} to ${endDate} for ${roomsNeeded} room(s)`,
    );
  }

  const nights = nightsBetween(startDate, endDate);
  const availNights = getAvailability(destinationId, startDate, endDate);

  const roomSubtotalUsd = availNights.reduce(
    (sum, night) => sum + night.nightlyRateUsd * roomsNeeded,
    0,
  );

  const taxesUsd = Math.round(roomSubtotalUsd * TAX_RATE * 100) / 100;
  const totalUsd = Math.round((roomSubtotalUsd + taxesUsd) * 100) / 100;

  return {
    nights,
    roomSubtotalUsd,
    taxesUsd,
    totalUsd,
    currency: 'USD',
  };
}
