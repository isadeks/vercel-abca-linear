/**
 * Vercel serverless function — POST /api/book
 *
 * Accepts a JSON booking request, delegates to createBooking(), and returns
 * a JSON confirmation or a structured validation error.
 *
 * Request body (JSON):
 *   roomId       {string}  Room identifier
 *   checkIn      {string}  ISO date string (YYYY-MM-DD)
 *   checkOut     {string}  ISO date string (YYYY-MM-DD)
 *   guestName    {string}  Full name of the guest
 *   guestEmail   {string}  Email address of the guest
 *   nightlyRate  {number}  Price per night in the booking currency
 *   taxRate      {number}  [optional] Fractional tax rate (default: 0.125)
 *
 * Responses:
 *   201  { success: true,  booking: { bookingRef, roomId, checkIn, checkOut,
 *                                     guestName, guestEmail, nights,
 *                                     subtotal, tax, total } }
 *   400  { success: false, errors: string[] }
 *   405  { success: false, errors: ['Method not allowed. Use POST.'] }
 *
 * Note: bookings are stored in memory (module-level) for demo purposes.
 * A production deployment would persist them in a database.
 */

import { createBooking } from './_lib/booking.js';

/**
 * In-memory bookings store.
 * Resets on cold start — adequate for demo/test environments.
 *
 * @type {Array<{roomId: string, checkIn: string, checkOut: string}>}
 */
export const bookings = [];

/**
 * Vercel serverless request handler.
 *
 * @param {object} req  Vercel/Node IncomingMessage with a parsed `body` property.
 * @param {object} res  Vercel/Node ServerResponse with `.status()` and `.json()` helpers.
 */
export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, errors: ['Method not allowed. Use POST.'] });
    return;
  }

  const result = createBooking(req.body, bookings);

  if (!result.success) {
    res.status(400).json(result);
    return;
  }

  // Persist the new booking so subsequent requests see correct availability.
  bookings.push({
    roomId: result.booking.roomId,
    checkIn: result.booking.checkIn,
    checkOut: result.booking.checkOut,
  });

  res.status(201).json(result);
}
