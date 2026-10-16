/**
 * payment.js — Payment gateway integration for the Wander booking engine.
 *
 * A framework-free ES module that wraps a generic payment gateway abstraction.
 * The module handles charge creation, validation, idempotency key generation,
 * and status normalisation.  It is intentionally provider-agnostic — the
 * gateway object passed into processPayment() follows a simple adapter
 * interface so the calling code can inject a real Stripe/Braintree adapter or
 * a test double without touching this module.
 *
 * @module payment
 */

/** All amounts are expected in the smallest currency unit (e.g. cents). */

/**
 * Supported payment statuses returned by this module.
 * @readonly
 * @enum {string}
 */
export const PaymentStatus = Object.freeze({
  PENDING:   'pending',
  SUCCEEDED: 'succeeded',
  FAILED:    'failed',
  REFUNDED:  'refunded',
});

/**
 * Generates a deterministic idempotency key from a booking reference and
 * timestamp so retried requests don't double-charge.
 *
 * @param {string} bookingRef
 * @param {string} [suffix]
 * @returns {string}
 */
export function generateIdempotencyKey(bookingRef, suffix = '') {
  if (!bookingRef) throw new Error('bookingRef is required');
  const ts = Date.now();
  return `${bookingRef}-${ts}${suffix ? `-${suffix}` : ''}`;
}

/**
 * Validates a payment request object, throwing descriptive errors for any
 * missing or out-of-range fields.
 *
 * @param {{ amountCents: number, currency: string, bookingRef: string, paymentMethodToken: string }} req
 */
export function validatePaymentRequest(req) {
  if (!req || typeof req !== 'object') throw new Error('payment request is required');

  if (!Number.isInteger(req.amountCents) || req.amountCents <= 0) {
    throw new Error('amountCents must be a positive integer (smallest currency unit)');
  }

  if (typeof req.currency !== 'string' || req.currency.trim().length !== 3) {
    throw new Error('currency must be a 3-letter ISO 4217 code (e.g. "USD")');
  }

  if (!req.bookingRef || typeof req.bookingRef !== 'string') {
    throw new Error('bookingRef is required');
  }

  if (!req.paymentMethodToken || typeof req.paymentMethodToken !== 'string') {
    throw new Error('paymentMethodToken is required');
  }
}

/**
 * Normalises a raw gateway response into a consistent shape used throughout
 * the booking engine.
 *
 * @param {object} gatewayResponse  raw provider response
 * @returns {{ status: string, gatewayId: string, amountCents: number, currency: string, raw: object }}
 */
export function normaliseGatewayResponse(gatewayResponse) {
  const status = gatewayResponse.status === 'succeeded' || gatewayResponse.paid === true
    ? PaymentStatus.SUCCEEDED
    : gatewayResponse.status === 'failed' || gatewayResponse.error
      ? PaymentStatus.FAILED
      : PaymentStatus.PENDING;

  return {
    status,
    gatewayId:   gatewayResponse.id  ?? gatewayResponse.transaction_id ?? null,
    amountCents: gatewayResponse.amountCents ?? gatewayResponse.amount ?? 0,
    currency:    (gatewayResponse.currency ?? 'usd').toUpperCase(),
    raw:         gatewayResponse,
  };
}

/**
 * Processes a payment through the supplied gateway adapter.
 *
 * The `gateway` parameter must implement:
 *   `gateway.charge({ amountCents, currency, token, idempotencyKey }) → Promise<object>`
 *
 * @param {object} gateway              adapter implementing `.charge()`
 * @param {{ amountCents: number, currency: string, bookingRef: string, paymentMethodToken: string }} req
 * @returns {Promise<{ status: string, gatewayId: string, amountCents: number, currency: string, raw: object }>}
 * @throws if validation fails or the gateway rejects
 */
export async function processPayment(gateway, req) {
  validatePaymentRequest(req);

  if (!gateway || typeof gateway.charge !== 'function') {
    throw new Error('gateway must implement a charge() method');
  }

  const idempotencyKey = generateIdempotencyKey(req.bookingRef);

  const raw = await gateway.charge({
    amountCents:    req.amountCents,
    currency:       req.currency.toLowerCase(),
    token:          req.paymentMethodToken,
    idempotencyKey,
  });

  const result = normaliseGatewayResponse(raw);

  if (result.status === PaymentStatus.FAILED) {
    const message = raw.error?.message ?? raw.failure_message ?? 'Payment failed';
    throw new Error(`Payment failed: ${message}`);
  }

  return result;
}

/**
 * Issues a full or partial refund through the gateway.
 *
 * The `gateway` parameter must implement:
 *   `gateway.refund({ gatewayId, amountCents }) → Promise<object>`
 *
 * @param {object} gateway
 * @param {{ gatewayId: string, amountCents?: number }} refundReq
 *   If amountCents is omitted the gateway should issue a full refund.
 * @returns {Promise<{ status: string, gatewayId: string }>}
 */
export async function refundPayment(gateway, refundReq) {
  if (!refundReq?.gatewayId) throw new Error('refundReq.gatewayId is required');

  if (!gateway || typeof gateway.refund !== 'function') {
    throw new Error('gateway must implement a refund() method');
  }

  const raw = await gateway.refund({
    gatewayId:   refundReq.gatewayId,
    amountCents: refundReq.amountCents,
  });

  return {
    status:    PaymentStatus.REFUNDED,
    gatewayId: raw.id ?? raw.refund_id ?? refundReq.gatewayId,
  };
}
