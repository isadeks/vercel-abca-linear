/**
 * pricing.js — nightly rates, taxes, and booking totals
 *
 * Builds on availability.js: requires a valid, available date range before
 * calculating prices. Exposes helpers consumed by booking.js.
 */

import { checkAvailability } from './availability.js';

/** VAT rate applied to all bookings (10 %). */
export const TAX_RATE = 0.10;

/**
 * Apply the standard tax rate to a pre-tax subtotal.
 * @param {number} subtotal - amount before tax (≥ 0)
 * @returns {number} tax amount, rounded to 2 decimal places
 */
export function calculateTax(subtotal) {
  if (subtotal < 0) {
    throw new RangeError('subtotal must be ≥ 0');
  }
  return Math.round(subtotal * TAX_RATE * 100) / 100;
}

/**
 * Calculate the full price breakdown for a booking.
 *
 * @param {string}   checkIn        - ISO date string for arrival
 * @param {string}   checkOut       - ISO date string for departure
 * @param {number}   nightlyRate    - price per night before tax (> 0)
 * @param {string[]} [blockedDates] - forwarded to checkAvailability
 * @returns {{
 *   checkIn:   string,
 *   checkOut:  string,
 *   nights:    number,
 *   nightlyRate: number,
 *   subtotal:  number,
 *   tax:       number,
 *   total:     number,
 *   available: boolean,
 * }}
 * @throws {Error} if the room is unavailable or the rate is invalid
 */
export function calculatePrice(checkIn, checkOut, nightlyRate, blockedDates = []) {
  if (nightlyRate <= 0) {
    throw new RangeError('nightlyRate must be > 0');
  }

  const { available, nights, blockedNights } = checkAvailability(
    checkIn,
    checkOut,
    blockedDates,
  );

  if (!available) {
    throw new Error(
      `Room is unavailable: nights blocked — ${blockedNights.join(', ')}`,
    );
  }

  const subtotal = Math.round(nights * nightlyRate * 100) / 100;
  const tax = calculateTax(subtotal);
  const total = Math.round((subtotal + tax) * 100) / 100;

  return {
    checkIn,
    checkOut,
    nights,
    nightlyRate,
    subtotal,
    tax,
    total,
    available: true,
  };
}
