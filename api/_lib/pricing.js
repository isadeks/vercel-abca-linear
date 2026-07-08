/**
 * Nightly rates, taxes, and booking totals.
 *
 * Depends on availability.js — uses isRoomAvailable to guard against pricing
 * an unavailable room.
 */

import { isRoomAvailable } from './availability.js';

/** Default tax rate applied to the base subtotal (12.5 %). */
export const DEFAULT_TAX_RATE = 0.125;

/**
 * Counts the number of nights between two ISO date strings.
 *
 * @param {string} checkIn   ISO date string e.g. "2024-06-01"
 * @param {string} checkOut  ISO date string
 * @returns {number}  Positive integer number of nights.
 * @throws {RangeError} When checkOut is not after checkIn.
 */
export function calculateNights(checkIn, checkOut) {
  const msPerDay = 24 * 60 * 60 * 1000;
  const nights = (new Date(checkOut) - new Date(checkIn)) / msPerDay;
  if (nights <= 0) {
    throw new RangeError(
      `checkOut (${checkOut}) must be after checkIn (${checkIn})`,
    );
  }
  return nights;
}

/**
 * Calculates the full pricing breakdown for a booking.
 *
 * @param {object} params
 * @param {string}  params.checkIn
 * @param {string}  params.checkOut
 * @param {number}  params.nightlyRate   Price per night in the booking currency.
 * @param {number} [params.taxRate]      Fractional tax rate, defaults to DEFAULT_TAX_RATE.
 * @param {string}  params.roomId
 * @param {Array<{roomId: string, checkIn: string, checkOut: string}>} params.existingBookings
 * @returns {{ nights: number, subtotal: number, tax: number, total: number }}
 * @throws {Error}      When the room is not available.
 * @throws {RangeError} When the date range is invalid.
 */
export function calculatePrice({
  checkIn,
  checkOut,
  nightlyRate,
  taxRate = DEFAULT_TAX_RATE,
  roomId,
  existingBookings,
}) {
  if (!isRoomAvailable(roomId, checkIn, checkOut, existingBookings)) {
    throw new Error(`Room ${roomId} is not available for the requested dates.`);
  }

  const nights = calculateNights(checkIn, checkOut);
  const subtotal = Math.round(nights * nightlyRate * 100) / 100;
  const tax = Math.round(subtotal * taxRate * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;

  return { nights, subtotal, tax, total };
}
