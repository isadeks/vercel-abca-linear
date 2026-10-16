/**
 * validation.js — Booking-request validation for Wander destinations.
 *
 * Pure functions, no I/O. Imports availability checks from ./availability.js.
 * Consumed by booking.js.
 */

import { isRangeAvailable } from './availability.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum guests allowed per room */
const MAX_GUESTS_PER_ROOM = 4;

/**
 * Basic email regex — requires local part, @, and domain with at least one dot.
 * Not RFC-complete; suitable for a first-pass server-side check.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------------------------------------------------------------------------
// Exported functions
// ---------------------------------------------------------------------------

/**
 * Validate a booking request.
 *
 * All failing rules are accumulated — validation does NOT short-circuit.
 *
 * @param {{
 *   destinationId: string,
 *   startDate:     string,
 *   endDate:       string,
 *   rooms:         number,
 *   guests:        number,
 *   email:         string,
 * }} request
 *
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateBookingRequest(request) {
  const { destinationId, startDate, endDate, rooms, guests, email } = request;
  const errors = [];

  // Rule 1: rooms >= 1
  if (typeof rooms !== 'number' || !Number.isInteger(rooms) || rooms < 1) {
    errors.push('rooms must be an integer >= 1');
  }

  // Rule 2: guests >= 1
  if (typeof guests !== 'number' || !Number.isInteger(guests) || guests < 1) {
    errors.push('guests must be an integer >= 1');
  } else if (typeof rooms === 'number' && Number.isInteger(rooms) && rooms >= 1) {
    // Rule 3: guests <= rooms * 4 (only evaluated when both rooms and guests are valid integers)
    if (guests > rooms * MAX_GUESTS_PER_ROOM) {
      errors.push(`guests (${guests}) exceeds maximum capacity of ${rooms * MAX_GUESTS_PER_ROOM} (rooms × ${MAX_GUESTS_PER_ROOM})`);
    }
  }

  // Rule 4: email matches basic regex
  if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
    errors.push('email must be a valid email address');
  }

  // Rule 5: date range must be available for the requested number of rooms.
  // isRangeAvailable throws on invalid / unknown destination or bad dates, so
  // we catch and surface those as validation errors rather than propagating
  // as uncaught exceptions.
  try {
    const roomsToCheck = typeof rooms === 'number' && Number.isInteger(rooms) && rooms >= 1
      ? rooms
      : 1;
    const available = isRangeAvailable(destinationId, startDate, endDate, roomsToCheck);
    if (!available) {
      errors.push(`the requested date range is not available for ${roomsToCheck} room(s) at destination "${destinationId}"`);
    }
  } catch (err) {
    errors.push(`availability check failed: ${err.message}`);
  }

  return { valid: errors.length === 0, errors };
}
