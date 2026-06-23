/**
 * Unit tests for the billing modules:
 *   api/_lib/stripe-client.js  — webhook signature verification, invoice shaping helpers
 *   api/billing.js             — event dispatch (handleStripeEvent)
 *   api/invoices.js            — invoice shaping (shapeInvoice)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  verifyWebhookSignatureAsync,
  hmacSha256Hex,
  listInvoices,
  stripeRequest,
} from '../api/_lib/stripe-client.js';
import { handleStripeEvent } from '../api/billing.js';
import { shapeInvoice } from '../api/invoices.js';

// ────────────────────────────────────────────────────────────
// helpers
// ────────────────────────────────────────────────────────────

/** Build a valid Stripe-Signature header for the given payload + secret */
async function makeStripeSignature(payload, secret, timestamp) {
  const ts   = timestamp ?? Math.floor(Date.now() / 1000);
  const signed = `${ts}.${payload}`;
  const sig  = await hmacSha256Hex(signed, secret);
  return { header: `t=${ts},v1=${sig}`, ts };
}

// ────────────────────────────────────────────────────────────
// 1. stripe-client: hmacSha256Hex
// ────────────────────────────────────────────────────────────

describe('hmacSha256Hex', () => {
  it('returns a 64-character hex string', async () => {
    const result = await hmacSha256Hex('hello', 'secret');
    expect(result).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic', async () => {
    const a = await hmacSha256Hex('payload', 'key');
    const b = await hmacSha256Hex('payload', 'key');
    expect(a).toBe(b);
  });

  it('changes with different payload', async () => {
    const a = await hmacSha256Hex('aaa', 'key');
    const b = await hmacSha256Hex('bbb', 'key');
    expect(a).not.toBe(b);
  });

  it('changes with different secret', async () => {
    const a = await hmacSha256Hex('payload', 'key1');
    const b = await hmacSha256Hex('payload', 'key2');
    expect(a).not.toBe(b);
  });
});

// ────────────────────────────────────────────────────────────
// 2. stripe-client: verifyWebhookSignatureAsync
// ────────────────────────────────────────────────────────────

describe('verifyWebhookSignatureAsync', () => {
  const secret  = 'whsec_testsecret';
  const payload = JSON.stringify({ type: 'invoice.payment_succeeded', data: { object: {} } });

  it('accepts a valid signature', async () => {
    const { header } = await makeStripeSignature(payload, secret);
    const result = await verifyWebhookSignatureAsync(payload, header, secret);
    expect(result.valid).toBe(true);
    expect(result.error).toBeNull();
    expect(result.event).toMatchObject({ type: 'invoice.payment_succeeded' });
  });

  it('rejects an invalid signature', async () => {
    const { header } = await makeStripeSignature(payload, 'wrong-secret');
    const result = await verifyWebhookSignatureAsync(payload, header, secret);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/mismatch/i);
  });

  it('rejects a missing Stripe-Signature header', async () => {
    const result = await verifyWebhookSignatureAsync(payload, '', secret);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/missing/i);
  });

  it('rejects when STRIPE_WEBHOOK_SECRET is not set', async () => {
    const { header } = await makeStripeSignature(payload, secret);
    const result = await verifyWebhookSignatureAsync(payload, header, undefined);
    // No secret passed and env var not set in this test environment
    expect(result.valid).toBe(false);
  });

  it('rejects a stale timestamp (replay attack)', async () => {
    const oldTs = Math.floor(Date.now() / 1000) - 400; // 400 s ago > 300 s tolerance
    const { header } = await makeStripeSignature(payload, secret, oldTs);
    const result = await verifyWebhookSignatureAsync(payload, header, secret);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/tolerance/i);
  });

  it('rejects a malformed Stripe-Signature header', async () => {
    const result = await verifyWebhookSignatureAsync(payload, 'garbage-header', secret);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/malformed/i);
  });

  it('rejects non-JSON body even if signature is valid', async () => {
    const badPayload = 'this-is-not-json';
    const { header } = await makeStripeSignature(badPayload, secret);
    const result = await verifyWebhookSignatureAsync(badPayload, header, secret);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/parse/i);
  });
});

// ────────────────────────────────────────────────────────────
// 3. billing: handleStripeEvent
// ────────────────────────────────────────────────────────────

describe('handleStripeEvent', () => {
  it('handles checkout.session.completed', () => {
    const event = {
      type: 'checkout.session.completed',
      data: { object: { customer: 'cus_123', subscription: 'sub_456' } },
    };
    const result = handleStripeEvent(event);
    expect(result.handled).toBe(true);
    expect(result.action).toMatch(/sub_456/);
    expect(result.action).toMatch(/cus_123/);
  });

  it('handles invoice.payment_succeeded', () => {
    const event = {
      type: 'invoice.payment_succeeded',
      data: { object: { subscription: 'sub_789', amount_paid: 1200 } },
    };
    const result = handleStripeEvent(event);
    expect(result.handled).toBe(true);
    expect(result.action).toMatch(/sub_789/);
    expect(result.action).toMatch(/1200/);
  });

  it('handles invoice.payment_failed', () => {
    const event = {
      type: 'invoice.payment_failed',
      data: { object: { subscription: 'sub_abc', customer: 'cus_xyz' } },
    };
    const result = handleStripeEvent(event);
    expect(result.handled).toBe(true);
    expect(result.action).toMatch(/sub_abc/);
    expect(result.action).toMatch(/cus_xyz/);
  });

  it('handles customer.subscription.updated', () => {
    const event = {
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_upd',
          status: 'active',
          items: { data: [{ price: { id: 'price_explorer_monthly' } }] },
        },
      },
    };
    const result = handleStripeEvent(event);
    expect(result.handled).toBe(true);
    expect(result.action).toMatch(/sub_upd/);
    expect(result.action).toMatch(/active/);
    expect(result.action).toMatch(/price_explorer_monthly/);
  });

  it('handles customer.subscription.deleted', () => {
    const event = {
      type: 'customer.subscription.deleted',
      data: { object: { id: 'sub_del', customer: 'cus_del' } },
    };
    const result = handleStripeEvent(event);
    expect(result.handled).toBe(true);
    expect(result.action).toMatch(/sub_del/);
  });

  it('marks unhandled event types as not handled', () => {
    const event = { type: 'some.unknown.event', data: { object: {} } };
    const result = handleStripeEvent(event);
    expect(result.handled).toBe(false);
    expect(result.action).toMatch(/unhandled/i);
  });

  it('does not throw on minimal event objects', () => {
    expect(() => handleStripeEvent({ type: 'invoice.payment_succeeded', data: {} })).not.toThrow();
    expect(() => handleStripeEvent({ type: 'customer.subscription.updated', data: {} })).not.toThrow();
  });
});

// ────────────────────────────────────────────────────────────
// 4. invoices: shapeInvoice
// ────────────────────────────────────────────────────────────

describe('shapeInvoice', () => {
  const raw = {
    id:                  'in_test123',
    number:              'WANDER-0001',
    status:              'paid',
    amount_due:          1200,
    amount_paid:         1200,
    currency:            'gbp',
    period_start:        1700000000,
    period_end:          1702592000,
    created:             1700000000,
    hosted_invoice_url:  'https://invoice.stripe.com/i/acct_test/test',
    invoice_pdf:         'https://pay.stripe.com/invoice/acct_test/test/pdf',
    subscription:        'sub_test456',
    customer:            'cus_test789',
  };

  it('maps all expected fields', () => {
    const shaped = shapeInvoice(raw);
    expect(shaped.id).toBe('in_test123');
    expect(shaped.number).toBe('WANDER-0001');
    expect(shaped.status).toBe('paid');
    expect(shaped.amountDue).toBe(1200);
    expect(shaped.amountPaid).toBe(1200);
    expect(shaped.currency).toBe('gbp');
    expect(shaped.periodStart).toBe(1700000000);
    expect(shaped.periodEnd).toBe(1702592000);
    expect(shaped.createdAt).toBe(1700000000);
    expect(shaped.hostedUrl).toBe(raw.hosted_invoice_url);
    expect(shaped.pdfUrl).toBe(raw.invoice_pdf);
    expect(shaped.subscriptionId).toBe('sub_test456');
    expect(shaped.customerId).toBe('cus_test789');
  });

  it('nulls out missing optional fields', () => {
    const minimal = { id: 'in_min', status: 'open', amount_due: 0, currency: 'gbp', created: 0 };
    const shaped = shapeInvoice(minimal);
    expect(shaped.hostedUrl).toBeNull();
    expect(shaped.pdfUrl).toBeNull();
    expect(shaped.subscriptionId).toBeNull();
    expect(shaped.customerId).toBeNull();
  });

  it('does not expose internal Stripe snake_case fields', () => {
    const shaped = shapeInvoice(raw);
    expect(shaped).not.toHaveProperty('amount_due');
    expect(shaped).not.toHaveProperty('hosted_invoice_url');
    expect(shaped).not.toHaveProperty('invoice_pdf');
    expect(shaped).not.toHaveProperty('period_start');
  });
});

// ────────────────────────────────────────────────────────────
// 5. stripe-client: stripeRequest (fetch mock)
// ────────────────────────────────────────────────────────────

describe('stripeRequest', () => {
  const originalFetch = globalThis.fetch;
  const originalEnv   = process.env.STRIPE_SECRET_KEY;

  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env.STRIPE_SECRET_KEY = originalEnv;
  });

  it('throws if STRIPE_SECRET_KEY is not set', async () => {
    delete process.env.STRIPE_SECRET_KEY;
    await expect(stripeRequest('/invoices')).rejects.toThrow('STRIPE_SECRET_KEY');
  });

  it('returns parsed JSON on 200', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: 'in_1' }], object: 'list' }),
    });

    const result = await stripeRequest('/invoices');
    expect(result.data[0].id).toBe('in_1');
  });

  it('throws a descriptive error on 4xx', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: { message: 'No such API key' } }),
    });

    await expect(stripeRequest('/invoices')).rejects.toThrow('No such API key');
  });

  it('appends query params to GET requests', async () => {
    let capturedUrl;
    globalThis.fetch = vi.fn().mockImplementation((url) => {
      capturedUrl = url;
      return Promise.resolve({ ok: true, json: async () => ({ data: [] }) });
    });

    await stripeRequest('/invoices', { params: { limit: '5', customer: 'cus_abc' } });
    expect(capturedUrl).toContain('limit=5');
    expect(capturedUrl).toContain('customer=cus_abc');
  });
});

// ────────────────────────────────────────────────────────────
// 6. stripe-client: listInvoices (fetch mock)
// ────────────────────────────────────────────────────────────

describe('listInvoices', () => {
  const originalFetch = globalThis.fetch;
  const originalEnv   = process.env.STRIPE_SECRET_KEY;

  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env.STRIPE_SECRET_KEY = originalEnv;
  });

  it('returns the data array from the Stripe response', async () => {
    const mockInvoices = [{ id: 'in_a' }, { id: 'in_b' }];
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: mockInvoices }),
    });

    const result = await listInvoices();
    expect(result).toEqual(mockInvoices);
  });

  it('returns empty array if data is absent', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    const result = await listInvoices();
    expect(result).toEqual([]);
  });

  it('forwards customer filter', async () => {
    let capturedUrl;
    globalThis.fetch = vi.fn().mockImplementation((url) => {
      capturedUrl = url;
      return Promise.resolve({ ok: true, json: async () => ({ data: [] }) });
    });

    await listInvoices({ customer: 'cus_xyz', limit: 10 });
    expect(capturedUrl).toContain('customer=cus_xyz');
    expect(capturedUrl).toContain('limit=10');
  });
});
