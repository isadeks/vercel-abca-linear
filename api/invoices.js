/**
 * /api/invoices — List invoices from Stripe (Vercel serverless function).
 *
 * GET /api/invoices?customer=<stripeCustomerId>&limit=<n>
 *
 * Returns an array of invoice summaries (id, amount_due, status, date,
 * hosted_invoice_url, pdf_url).
 *
 * Env vars (required at runtime):
 *   STRIPE_SECRET_KEY — Stripe secret key (test or live)
 */

import { listInvoices } from './_lib/stripe-client.js';

/**
 * Shape a raw Stripe invoice object into a compact public response.
 * @param {object} invoice - raw Stripe invoice
 * @returns {object}
 */
export function shapeInvoice(invoice) {
  return {
    id: invoice.id,
    number: invoice.number,
    status: invoice.status,
    amountDue: invoice.amount_due,
    amountPaid: invoice.amount_paid,
    currency: invoice.currency,
    periodStart: invoice.period_start,
    periodEnd: invoice.period_end,
    createdAt: invoice.created,
    hostedUrl: invoice.hosted_invoice_url ?? null,
    pdfUrl: invoice.invoice_pdf ?? null,
    subscriptionId: invoice.subscription ?? null,
    customerId: invoice.customer ?? null,
  };
}

/**
 * Vercel serverless function entry point.
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse}  res
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { customer, limit } = req.query ?? {};
  const limitNum = limit ? Math.min(Number(limit), 100) : 20;

  if (limit && (isNaN(limitNum) || limitNum < 1)) {
    return res.status(400).json({ error: 'Invalid limit parameter' });
  }

  let invoices;
  try {
    invoices = await listInvoices({
      customer: customer || undefined,
      limit: limitNum,
    });
  } catch (err) {
    const status = err.statusCode ?? 500;
    return res.status(status).json({ error: err.message });
  }

  return res.status(200).json({
    invoices: invoices.map(shapeInvoice),
    count: invoices.length,
  });
}
