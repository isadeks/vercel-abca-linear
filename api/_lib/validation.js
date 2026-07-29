// validation.js — validates a trip quote request.
//
// Imports availability to check the destination is real and the dates are
// bookable. Produces a normalized request on success or a structured error
// (code + message) on the first failure. Framework-free; no I/O.

import { isKnownDestination, isAvailable } from './availability.js';

/** Maximum guests allowed per room. */
export const MAX_GUESTS_PER_ROOM = 4;

/**
 * @typedef {Object} ValidationError
 * @property {string} code    Machine-readable error code.
 * @property {string} message Human-readable message.
 */

/**
 * @typedef {Object} NormalizedRequest
 * @property {string} destinationId
 * @property {string} checkIn
 * @property {string} checkOut
 * @property {number} rooms
 * @property {number} guests
 * @property {string} email
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} ok
 * @property {NormalizedRequest} [value] Present when ok.
 * @property {ValidationError} [error]   Present when not ok.
 */

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// Pragmatic email shape: something@something.tld with no spaces. Not RFC 5322,
// but enough to reject obvious garbage without an external dependency.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function err(code, message) {
  return { ok: false, error: { code, message } };
}

/**
 * Parse an ISO calendar date, verifying it is a real date (rejects e.g.
 * 2026-02-30 or 2026-13-01). Returns a UTC Date on success or null.
 * @param {string} value
 * @returns {Date | null}
 */
export function parseIsoDate(value) {
  if (typeof value !== 'string' || !ISO_DATE_RE.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  // Round-trip check: JS Date rolls invalid components over, so a valid input
  // must reproduce the same year/month/day.
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

function isPositiveInteger(value) {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

/**
 * Validate and normalize a raw trip quote request.
 * @param {unknown} body
 * @returns {ValidationResult}
 */
export function validateBookingRequest(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return err('invalid_body', 'The request body must be a JSON object.');
  }

  const { destinationId, checkIn, checkOut, rooms, guests, email } =
    /** @type {Record<string, unknown>} */ (body);

  if (typeof destinationId !== 'string' || !isKnownDestination(destinationId)) {
    return err('unknown_destination', 'The selected destination is not available.');
  }

  const checkInDate = parseIsoDate(checkIn);
  const checkOutDate = parseIsoDate(checkOut);
  if (!checkInDate || !checkOutDate) {
    return err('invalid_dates', 'Check-in and check-out must be valid ISO dates (YYYY-MM-DD).');
  }
  if (checkOutDate.getTime() <= checkInDate.getTime()) {
    return err('invalid_dates', 'Check-out must be after check-in.');
  }

  if (!isPositiveInteger(rooms)) {
    return err('invalid_rooms', 'Rooms must be a positive integer.');
  }
  if (!isPositiveInteger(guests)) {
    return err('invalid_guests', 'Guests must be a positive integer.');
  }
  if (guests > rooms * MAX_GUESTS_PER_ROOM) {
    return err(
      'too_many_guests',
      `At most ${MAX_GUESTS_PER_ROOM} guests are allowed per room.`,
    );
  }

  if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
    return err('invalid_email', 'A valid email address is required.');
  }

  if (!isAvailable(destinationId, checkIn, checkOut)) {
    return err('sold_out', 'The selected dates are not available.');
  }

  return {
    ok: true,
    value: {
      destinationId,
      checkIn: /** @type {string} */ (checkIn),
      checkOut: /** @type {string} */ (checkOut),
      rooms,
      guests,
      email,
    },
  };
}
