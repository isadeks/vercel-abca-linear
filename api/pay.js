/**
 * pay.js — Vercel serverless entrypoint for processing a Wander booking payment.
 *
 * POST /api/pay
 *   Body: { confirmationId, amountUsd, card: { number, expiry, cvv, holderName } }
 *
 *   200: { ok: true, transactionId, confirmationId, amountUsd, status: 'captured' }
 *   400: { ok: false, errors: string[] }
 *   402: { ok: false, errors: string[], declined: true }
 */

import { processPayment } from './_lib/payment.js';

/**
 * Vercel serverless function handler.
 *
 * @param {import('@vercel/node').VercelRequest}  req
 * @param {import('@vercel/node').VercelResponse} res
 */
export default function handler(req, res) {
  const body = req.body ?? {};
  const result = processPayment(body);

  if (!result.ok) {
    const statusCode = result.declined ? 402 : 400;
    return res.status(statusCode).json(result);
  }

  return res.status(200).json(result);
}
