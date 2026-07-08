/**
 * Top-level booking creation.
 *
 * Depends on pricing.js (calculatePrice) and validation.js
 * (validateBookingRequest) — orchestrates both into a single createBooking()
 * entry point consumed by Vercel serverless functions.
 */

import { calculatePrice } from './pricing.js';
import { validateBookingRequest } from './validation.js';

/**
 * Generates a simple booking reference string.
 * Not cryptographically strong — adequate for demo/test environments.
 *
 * @returns {string}  e.g. "BK-A3F2C1"
 */
function generateBookingRef() {
  const hex = Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .toUpperCase()
    .padStart(6, '0');
  return `BK-${hex}`;
}

/**
 * Creates a booking if the request is valid and the room is available.
 *
 * @param {object} request          Booking request.
 * @param {string} request.roomId
 * @param {string} request.checkIn  ISO date string.
 * @param {string} request.checkOut ISO date string.
 * @param {string} request.guestName
 * @param {string} request.guestEmail
 * @param {number} request.nightlyRate   Price per night.
 * @param {number} [request.taxRate]     Optional tax rate override.
 * @param {Array<{roomId: string, checkIn: string, checkOut: string}>} existingBookings
 * @returns {{
 *   success: true,
 *   booking: {
 *     bookingRef: string,
 *     roomId: string,
 *     checkIn: string,
 *     checkOut: string,
 *     guestName: string,
 *     guestEmail: string,
 *     nights: number,
 *     subtotal: number,
 *     tax: number,
 *     total: number,
 *   }
 * } | {
 *   success: false,
 *   errors: string[]
 * }}
 */
export function createBooking(request, existingBookings) {
  // Validate first — this also checks availability
  const { valid, errors } = validateBookingRequest(request, existingBookings);
  if (!valid) {
    return { success: false, errors };
  }

  const { roomId, checkIn, checkOut, guestName, guestEmail, nightlyRate, taxRate } =
    request;

  const pricing = calculatePrice({
    roomId,
    checkIn,
    checkOut,
    nightlyRate,
    ...(taxRate !== undefined && { taxRate }),
    existingBookings,
  });

  return {
    success: true,
    booking: {
      bookingRef: generateBookingRef(),
      roomId,
      checkIn,
      checkOut,
      guestName,
      guestEmail,
      nights: pricing.nights,
      subtotal: pricing.subtotal,
      tax: pricing.tax,
      total: pricing.total,
    },
  };
}
