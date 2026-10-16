/**
 * booking.js — Core booking domain module for Wander destinations.
 *
 * Imports validation from ./validation.js and pricing from ./pricing.js.
 * Pure function, no I/O, no external dependencies.
 */

import { validateBookingRequest } from './validation.js';
import { quote } from './pricing.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Derive a deterministic confirmation ID from booking request fields.
 * Format: <destinationId>-<startDate>-<endDate>-r<rooms>-g<guests>
 *
 * @param {{ destinationId: string, startDate: string, endDate: string, rooms: number, guests: number }} request
 * @returns {string}
 */
function deriveConfirmationId({ destinationId, startDate, endDate, rooms, guests }) {
  return `${destinationId}-${startDate}-${endDate}-r${rooms}-g${guests}`;
}

// ---------------------------------------------------------------------------
// Exported functions
// ---------------------------------------------------------------------------

/**
 * Create a booking for a Wander destination.
 *
 * Validates the request first; if invalid, returns `{ ok: false, errors }`.
 * If valid, computes the price quote and returns:
 * `{ ok: true, confirmationId, destinationId, startDate, endDate, rooms, guests, quote }`
 *
 * @param {{
 *   destinationId: string,
 *   startDate:     string,
 *   endDate:       string,
 *   rooms:         number,
 *   guests:        number,
 *   email:         string,
 * }} request
 * @param {string} [id]  Optional override for confirmationId (useful in tests)
 * @returns {{ ok: false, errors: string[] } | { ok: true, confirmationId: string, destinationId: string, startDate: string, endDate: string, rooms: number, guests: number, quote: object }}
 */
export function createBooking(request, id) {
  const { valid, errors } = validateBookingRequest(request);

  if (!valid) {
    return { ok: false, errors };
  }

  const { destinationId, startDate, endDate, rooms, guests } = request;
  const priceQuote = quote(destinationId, startDate, endDate, rooms);
  const confirmationId = id ?? deriveConfirmationId(request);

  return {
    ok: true,
    confirmationId,
    destinationId,
    startDate,
    endDate,
    rooms,
    guests,
    quote: priceQuote,
  };
}
