/**
 * /api/billing — Stripe webhook handler (Vercel serverless function).
 *
 * Verifies the Stripe-Signature header and dispatches on event type:
 *   invoice.payment_succeeded  → mark subscription active / renew
 *   invoice.payment_failed     → notify / mark subscription past-due
 *   customer.subscription.updated  → sync plan changes
 *   customer.subscription.deleted  → mark subscription cancelled
 *   checkout.session.completed → provision new subscription
 *
 * Env vars (required at runtime):
 *   STRIPE_SECRET_KEY      — Stripe secret key (test or live)
 *   STRIPE_WEBHOOK_SECRET  — Stripe webhook signing secret
 */

import { verifyWebhookSignatureAsync } from './_lib/stripe-client.js';

/**
 * Collect the raw request body as a string.
 * Vercel passes the body pre-parsed by default; this function handles both
 * the raw-body Buffer/Readable case and a pre-parsed string/object.
 * @param {import('http').IncomingMessage} req
 * @returns {Promise<string>}
 */
async function getRawBody(req) {
  // Vercel with `bodyParser: false` — stream the bytes
  if (typeof req.body === 'undefined' || req.body === null) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      req.on('data', (chunk) => chunks.push(chunk));
      req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      req.on('error', reject);
    });
  }
  // Vercel already parsed the body
  if (typeof req.body === 'string') return req.body;
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
  return JSON.stringify(req.body);
}

/**
 * Dispatch on Stripe event type and return a summary of what was done.
 * In a real application this would update a database.
 * @param {object} event - verified Stripe event object
 * @returns {{ handled: boolean, action: string }}
 */
export function handleStripeEvent(event) {
  const { type, data } = event;
  const obj = data?.object ?? {};

  switch (type) {
    case 'checkout.session.completed': {
      const customerId = obj.customer;
      const subscriptionId = obj.subscription;
      // TODO: persist { customerId, subscriptionId, status: 'active' } in DB
      return {
        handled: true,
        action: `provisioned subscription ${subscriptionId} for customer ${customerId}`,
      };
    }

    case 'invoice.payment_succeeded': {
      const subscriptionId = obj.subscription;
      const amountPaid = obj.amount_paid ?? 0;
      // TODO: mark subscription as active; record payment in DB
      return {
        handled: true,
        action: `payment succeeded for subscription ${subscriptionId}: ${amountPaid} cents`,
      };
    }

    case 'invoice.payment_failed': {
      const subscriptionId = obj.subscription;
      const customerId = obj.customer;
      // TODO: mark subscription as past_due; send notification email
      return {
        handled: true,
        action: `payment failed for subscription ${subscriptionId}, customer ${customerId}`,
      };
    }

    case 'customer.subscription.updated': {
      const subscriptionId = obj.id;
      const status = obj.status;
      const priceId = obj.items?.data?.[0]?.price?.id;
      // TODO: sync plan / status changes to DB
      return {
        handled: true,
        action: `subscription ${subscriptionId} updated: status=${status}, priceId=${priceId}`,
      };
    }

    case 'customer.subscription.deleted': {
      const subscriptionId = obj.id;
      const customerId = obj.customer;
      // TODO: mark subscription as cancelled in DB
      return {
        handled: true,
        action: `subscription ${subscriptionId} deleted for customer ${customerId}`,
      };
    }

    default:
      return { handled: false, action: `unhandled event type: ${type}` };
  }
}

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

  const sigHeader = req.headers['stripe-signature'] ?? '';
  let rawBody;
  try {
    rawBody = await getRawBody(req);
  } catch {
    return res.status(400).json({ error: 'Failed to read request body' });
  }

  const { valid, event, error } = await verifyWebhookSignatureAsync(rawBody, sigHeader);
  if (!valid) {
    return res.status(400).json({ error: `Webhook signature invalid: ${error}` });
  }

  let result;
  try {
    result = handleStripeEvent(event);
  } catch {
    return res.status(500).json({ error: 'Internal error processing event' });
  }

  return res.status(200).json({ received: true, ...result });
}

// Tell Vercel NOT to parse the body — we need the raw bytes for signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};
