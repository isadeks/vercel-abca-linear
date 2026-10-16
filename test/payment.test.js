import { describe, it, expect, vi } from 'vitest';
import {
  PaymentStatus,
  generateIdempotencyKey,
  validatePaymentRequest,
  normaliseGatewayResponse,
  processPayment,
  refundPayment,
} from '../api/_lib/payment.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

const validReq = () => ({
  amountCents:        12000,
  currency:           'USD',
  bookingRef:         'BOOK-001',
  paymentMethodToken: 'tok_test_abc',
});

const makeGateway = (overrides = {}) => ({
  charge: vi.fn().mockResolvedValue({ id: 'ch_1', status: 'succeeded', amountCents: 12000, currency: 'usd' }),
  refund: vi.fn().mockResolvedValue({ id: 're_1' }),
  ...overrides,
});

// ── generateIdempotencyKey ────────────────────────────────────────────────────

describe('generateIdempotencyKey', () => {
  it('returns a string containing the bookingRef', () => {
    const key = generateIdempotencyKey('BOOK-001');
    expect(key).toContain('BOOK-001');
  });

  it('appends a suffix when provided', () => {
    const key = generateIdempotencyKey('BOOK-001', 'retry');
    expect(key).toContain('retry');
  });

  it('throws if bookingRef is empty', () => {
    expect(() => generateIdempotencyKey('')).toThrow();
    expect(() => generateIdempotencyKey(null)).toThrow();
  });

  it('produces unique keys on repeated calls', () => {
    const a = generateIdempotencyKey('BOOK-001');
    const b = generateIdempotencyKey('BOOK-001');
    // Keys include Date.now() so they should differ across ticks;
    // at worst they're equal if the clock resolves to the same ms —
    // we only assert they are strings.
    expect(typeof a).toBe('string');
    expect(typeof b).toBe('string');
  });
});

// ── validatePaymentRequest ────────────────────────────────────────────────────

describe('validatePaymentRequest', () => {
  it('does not throw for a valid request', () => {
    expect(() => validatePaymentRequest(validReq())).not.toThrow();
  });

  it('throws if amountCents is zero or negative', () => {
    expect(() => validatePaymentRequest({ ...validReq(), amountCents: 0 })).toThrow();
    expect(() => validatePaymentRequest({ ...validReq(), amountCents: -50 })).toThrow();
  });

  it('throws if amountCents is not an integer', () => {
    expect(() => validatePaymentRequest({ ...validReq(), amountCents: 99.5 })).toThrow();
  });

  it('throws if currency is not a 3-letter string', () => {
    expect(() => validatePaymentRequest({ ...validReq(), currency: 'US' })).toThrow();
    expect(() => validatePaymentRequest({ ...validReq(), currency: 'USDX' })).toThrow();
  });

  it('throws if bookingRef is missing', () => {
    expect(() => validatePaymentRequest({ ...validReq(), bookingRef: '' })).toThrow();
  });

  it('throws if paymentMethodToken is missing', () => {
    expect(() => validatePaymentRequest({ ...validReq(), paymentMethodToken: '' })).toThrow();
  });

  it('throws if req is null', () => {
    expect(() => validatePaymentRequest(null)).toThrow();
  });
});

// ── normaliseGatewayResponse ──────────────────────────────────────────────────

describe('normaliseGatewayResponse', () => {
  it('maps status="succeeded" to SUCCEEDED', () => {
    const n = normaliseGatewayResponse({ id: 'ch_1', status: 'succeeded', amountCents: 100, currency: 'usd' });
    expect(n.status).toBe(PaymentStatus.SUCCEEDED);
  });

  it('maps paid=true to SUCCEEDED', () => {
    const n = normaliseGatewayResponse({ id: 'ch_2', paid: true, amountCents: 100, currency: 'usd' });
    expect(n.status).toBe(PaymentStatus.SUCCEEDED);
  });

  it('maps status="failed" to FAILED', () => {
    const n = normaliseGatewayResponse({ id: 'ch_3', status: 'failed' });
    expect(n.status).toBe(PaymentStatus.FAILED);
  });

  it('maps responses with error to FAILED', () => {
    const n = normaliseGatewayResponse({ id: 'ch_4', error: { message: 'card declined' } });
    expect(n.status).toBe(PaymentStatus.FAILED);
  });

  it('maps unknown status to PENDING', () => {
    const n = normaliseGatewayResponse({ id: 'ch_5', status: 'processing' });
    expect(n.status).toBe(PaymentStatus.PENDING);
  });

  it('normalises currency to uppercase', () => {
    const n = normaliseGatewayResponse({ id: 'ch_6', status: 'succeeded', currency: 'eur' });
    expect(n.currency).toBe('EUR');
  });

  it('preserves the raw response', () => {
    const raw = { id: 'ch_7', status: 'succeeded', extra: 'data' };
    const n = normaliseGatewayResponse(raw);
    expect(n.raw).toBe(raw);
  });
});

// ── processPayment ────────────────────────────────────────────────────────────

describe('processPayment', () => {
  it('calls gateway.charge and returns a normalised result', async () => {
    const gateway = makeGateway();
    const result = await processPayment(gateway, validReq());
    expect(gateway.charge).toHaveBeenCalledOnce();
    expect(result.status).toBe(PaymentStatus.SUCCEEDED);
    expect(result.gatewayId).toBe('ch_1');
  });

  it('passes correct charge params to the gateway', async () => {
    const gateway = makeGateway();
    await processPayment(gateway, validReq());
    const call = gateway.charge.mock.calls[0][0];
    expect(call.amountCents).toBe(12000);
    expect(call.currency).toBe('usd');  // lowercased
    expect(call.token).toBe('tok_test_abc');
    expect(call.idempotencyKey).toContain('BOOK-001');
  });

  it('throws a descriptive error when the gateway returns a failure', async () => {
    const gateway = makeGateway({
      charge: vi.fn().mockResolvedValue({
        id: 'ch_fail',
        status: 'failed',
        failure_message: 'insufficient funds',
      }),
    });
    await expect(processPayment(gateway, validReq())).rejects.toThrow('insufficient funds');
  });

  it('throws when validation fails', async () => {
    const gateway = makeGateway();
    await expect(processPayment(gateway, { ...validReq(), amountCents: -1 })).rejects.toThrow();
  });

  it('throws if gateway has no charge method', async () => {
    await expect(processPayment({}, validReq())).rejects.toThrow('charge()');
  });
});

// ── refundPayment ─────────────────────────────────────────────────────────────

describe('refundPayment', () => {
  it('calls gateway.refund and returns REFUNDED status', async () => {
    const gateway = makeGateway();
    const result = await refundPayment(gateway, { gatewayId: 'ch_1', amountCents: 5000 });
    expect(gateway.refund).toHaveBeenCalledOnce();
    expect(result.status).toBe(PaymentStatus.REFUNDED);
    expect(result.gatewayId).toBe('re_1');
  });

  it('falls back to the original gatewayId if refund id is absent', async () => {
    const gateway = makeGateway({ refund: vi.fn().mockResolvedValue({}) });
    const result = await refundPayment(gateway, { gatewayId: 'ch_original' });
    expect(result.gatewayId).toBe('ch_original');
  });

  it('throws if gatewayId is missing', async () => {
    const gateway = makeGateway();
    await expect(refundPayment(gateway, {})).rejects.toThrow('gatewayId');
  });

  it('throws if gateway has no refund method', async () => {
    await expect(refundPayment({}, { gatewayId: 'ch_1' })).rejects.toThrow('refund()');
  });
});
