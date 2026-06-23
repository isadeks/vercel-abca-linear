/**
 * /api/checkout — Create a Stripe Checkout Session (Vercel serverless function).
 *
 * POST /api/checkout
 * Body (JSON): { priceId: string, customerId?: string, successUrl: string, cancelUrl: string }
 *
 * Returns: { url: string } — the Stripe-hosted checkout URL.
 *
 * Env vars (required at runtime):
 *   STRIPE_SECRET_KEY — Stripe secret key (test or live)
 */

import { createCheckoutSession } from './_lib/stripe-client.js';

/**
 * Vercel serverless function entry point.
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse}  res
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { priceId, customerId, successUrl, cancelUrl } = req.body ?? {};

  if (!priceId || typeof priceId !== 'string') {
    return res.status(400).json({ error: 'priceId is required' });
  }
  if (!successUrl || !cancelUrl) {
    return res.status(400).json({ error: 'successUrl and cancelUrl are required' });
  }

  let session;
  try {
    session = await createCheckoutSession({
      priceId,
      customerId: customerId || undefined,
      successUrl,
      cancelUrl,
    });
  } catch (err) {
    const status = err.statusCode ?? 500;
    return res.status(status).json({ error: err.message });
  }

  return res.status(200).json({ url: session.url });
}
