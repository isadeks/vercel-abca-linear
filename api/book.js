/**
 * book.js — Vercel serverless entrypoint for booking a Wander destination.
 *
 * POST /api/book
 *   Body: { destinationId, startDate, endDate, rooms, guests, email }
 *   200: { ok: true, confirmationId, destinationId, startDate, endDate, rooms, guests, quote }
 *   400: { ok: false, errors: string[] }
 */

import { createBooking } from './_lib/booking.js';

/**
 * Vercel serverless function handler.
 *
 * @param {import('@vercel/node').VercelRequest}  req
 * @param {import('@vercel/node').VercelResponse} res
 */
export default function handler(req, res) {
  const body = req.body ?? {};
  const result = createBooking(body);

  if (!result.ok) {
    return res.status(400).json(result);
  }

  return res.status(200).json(result);
}
