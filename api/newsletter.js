/**
 * POST /api/newsletter
 *
 * Accepts a JSON body `{ "email": "<address>" }`, validates the address,
 * and stores it in an in-memory list (suitable for a Vercel serverless
 * function; swap for a DB call in production).
 *
 * Success  → 200  { status: "ok",    message: "Subscribed successfully." }
 * Invalid  → 400  { status: "error", message: "Invalid email address." }
 * Wrong method → 405 { status: "error", message: "Method not allowed." }
 */

import { validateEmail } from './_lib/newsletter.js';

/** In-memory subscriber list (reset on cold-start). */
export const subscribers = [];

/**
 * Vercel serverless handler.
 *
 * @param {import('@vercel/node').VercelRequest}  req
 * @param {import('@vercel/node').VercelResponse} res
 */
export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res
      .status(405)
      .json({ status: 'error', message: 'Method not allowed.' });
  }

  const email = req.body?.email;

  if (!validateEmail(email)) {
    return res
      .status(400)
      .json({ status: 'error', message: 'Invalid email address.' });
  }

  subscribers.push(email);

  return res
    .status(200)
    .json({ status: 'ok', message: 'Subscribed successfully.' });
}
