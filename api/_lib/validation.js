/**
 * Booking request validation.
 *
 * Depends on availability.js — re-checks room availability as part of
 * validating a booking request so callers get a single authoritative verdict.
 */

import { isRoomAvailable } from './availability.js';

/**
 * Validates a booking request object and returns a structured result.
 *
 * @param {object} request  Raw booking request (may have missing/invalid fields).
 * @param {Array<{roomId: string, checkIn: string, checkOut: string}>} existingBookings
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateBookingRequest(request, existingBookings) {
  const errors = [];

  if (!request || typeof request !== 'object') {
    return { valid: false, errors: ['Request must be a non-null object.'] };
  }

  const { roomId, checkIn, checkOut, guestName, guestEmail } = request;

  // roomId
  if (!roomId || typeof roomId !== 'string' || !roomId.trim()) {
    errors.push('roomId is required and must be a non-empty string.');
  }

  // dates — presence
  if (!checkIn || typeof checkIn !== 'string') {
    errors.push('checkIn is required and must be an ISO date string.');
  }
  if (!checkOut || typeof checkOut !== 'string') {
    errors.push('checkOut is required and must be an ISO date string.');
  }

  // dates — format & logic (only when both are present strings)
  if (checkIn && checkOut && typeof checkIn === 'string' && typeof checkOut === 'string') {
    const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
    if (!ISO_RE.test(checkIn)) {
      errors.push(`checkIn "${checkIn}" is not a valid ISO date (YYYY-MM-DD).`);
    }
    if (!ISO_RE.test(checkOut)) {
      errors.push(`checkOut "${checkOut}" is not a valid ISO date (YYYY-MM-DD).`);
    }
    if (ISO_RE.test(checkIn) && ISO_RE.test(checkOut) && checkOut <= checkIn) {
      errors.push('checkOut must be after checkIn.');
    }
  }

  // guestName
  if (!guestName || typeof guestName !== 'string' || !guestName.trim()) {
    errors.push('guestName is required and must be a non-empty string.');
  }

  // guestEmail — basic format check
  if (!guestEmail || typeof guestEmail !== 'string') {
    errors.push('guestEmail is required.');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
    errors.push(`guestEmail "${guestEmail}" is not a valid email address.`);
  }

  // availability — only when all required fields pass earlier checks
  if (
    errors.length === 0 &&
    !isRoomAvailable(roomId, checkIn, checkOut, existingBookings)
  ) {
    errors.push(`Room ${roomId} is not available for the requested dates.`);
  }

  return { valid: errors.length === 0, errors };
}
