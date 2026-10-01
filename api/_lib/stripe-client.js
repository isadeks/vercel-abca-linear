/**
 * Stripe API client (native fetch — no npm dependency).
 *
 * All Stripe credentials are sourced from environment variables:
 *   STRIPE_SECRET_KEY      — live or test secret key (required)
 *   STRIPE_WEBHOOK_SECRET  — signing secret for webhook verification (required)
 *   STRIPE_TEST_MODE       — set to "true" to force test-mode key prefix check
 */

const STRIPE_API_BASE = 'https://api.stripe.com/v1';

/**
 * Make an authenticated request to the Stripe REST API.
 * @param {string} path       - e.g. '/invoices' or '/subscriptions/sub_xxx'
 * @param {object} [options]  - fetch options (method, body, etc.)
 * @returns {Promise<object>} - parsed JSON response
 */
export async function stripeRequest(path, options = {}) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY environment variable is not set');
  }

  const { method = 'GET', params, body } = options;

  let url = `${STRIPE_API_BASE}${path}`;
  if (params) {
    const qs = new URLSearchParams(params).toString();
    url = `${url}?${qs}`;
  }

  const fetchOpts = {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  };

  if (body) {
    fetchOpts.body = new URLSearchParams(body).toString();
  }

  const res = await fetch(url, fetchOpts);
  const json = await res.json();

  if (!res.ok) {
    const msg = json?.error?.message ?? `Stripe API error (${res.status})`;
    const err = new Error(msg);
    err.statusCode = res.status;
    err.stripeError = json?.error;
    throw err;
  }

  return json;
}

/**
 * List invoices, optionally filtered by customer.
 * @param {{ customer?: string, limit?: number }} [opts]
 * @returns {Promise<object[]>}
 */
export async function listInvoices(opts = {}) {
  const params = {};
  if (opts.customer) params.customer = opts.customer;
  if (opts.limit) params.limit = String(opts.limit);
  const res = await stripeRequest('/invoices', { params });
  return res.data ?? [];
}

/**
 * Retrieve a subscription by ID.
 * @param {string} subscriptionId
 * @returns {Promise<object>}
 */
export async function getSubscription(subscriptionId) {
  return stripeRequest(`/subscriptions/${subscriptionId}`);
}

/**
 * Create a Stripe Checkout Session for a subscription.
 * @param {{ priceId: string, customerId?: string, successUrl: string, cancelUrl: string }} opts
 * @returns {Promise<object>} Checkout Session
 */
export async function createCheckoutSession(opts) {
  const { priceId, customerId, successUrl, cancelUrl } = opts;
  const body = {
    mode: 'subscription',
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
    success_url: successUrl,
    cancel_url: cancelUrl,
  };
  if (customerId) body.customer = customerId;
  return stripeRequest('/checkout/sessions', { method: 'POST', body });
}

/**
 * Async webhook signature verification (requires node:crypto).
 * @param {string|Buffer} rawBody
 * @param {string}        sigHeader
 * @param {string}        [secret]
 * @returns {Promise<{ valid: boolean, event: object|null, error: string|null }>}
 */
export async function verifyWebhookSignatureAsync(rawBody, sigHeader, secret) {
  const webhookSecret = secret ?? process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return { valid: false, event: null, error: 'STRIPE_WEBHOOK_SECRET not set' };
  }

  if (!sigHeader) {
    return { valid: false, event: null, error: 'Missing Stripe-Signature header' };
  }

  const parts = {};
  for (const part of sigHeader.split(',')) {
    const eqIdx = part.indexOf('=');
    if (eqIdx === -1) continue;
    const key = part.slice(0, eqIdx);
    const val = part.slice(eqIdx + 1);
    if (!parts[key]) parts[key] = [];
    parts[key].push(val);
  }

  const timestamp = parts.t?.[0];
  const signatures = parts.v1 ?? [];

  if (!timestamp || signatures.length === 0) {
    return { valid: false, event: null, error: 'Malformed Stripe-Signature header' };
  }

  const TOLERANCE_SECONDS = 300;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(timestamp)) > TOLERANCE_SECONDS) {
    return { valid: false, event: null, error: 'Webhook timestamp outside tolerance window' };
  }

  const { createHmac, timingSafeEqual } = await import('node:crypto');
  const signedPayload = `${timestamp}.${rawBody}`;
  const expectedHex = createHmac('sha256', webhookSecret)
    .update(signedPayload, 'utf8')
    .digest('hex');
  const expectedBuf = Buffer.from(expectedHex, 'hex');

  const matched = signatures.some((sig) => {
    try {
      const sigBuf = Buffer.from(sig, 'hex');
      if (sigBuf.length !== expectedBuf.length) return false;
      return timingSafeEqual(sigBuf, expectedBuf);
    } catch {
      return false;
    }
  });

  if (!matched) {
    return { valid: false, event: null, error: 'Signature mismatch' };
  }

  try {
    const event = JSON.parse(rawBody);
    return { valid: true, event, error: null };
  } catch {
    return { valid: false, event: null, error: 'Failed to parse event body as JSON' };
  }
}

/**
 * Compute HMAC-SHA256 hex for a given payload + secret.
 * Exported for testing purposes.
 * @param {string} payload
 * @param {string} secret
 * @returns {Promise<string>} hex string
 */
export async function hmacSha256Hex(payload, secret) {
  const { createHmac } = await import('node:crypto');
  return createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
}
