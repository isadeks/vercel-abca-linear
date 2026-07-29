import { describe, it, expect } from 'vitest';
import { createQuote, generateRequestId } from '../api/_lib/booking.js';

function baseRequest(overrides = {}) {
  return {
    destinationId: 'santorini',
    checkIn: '2026-09-10',
    checkOut: '2026-09-13',
    rooms: 2,
    guests: 4,
    email: 'traveler@example.com',
    ...overrides,
  };
}

describe('booking: createQuote', () => {
  it('produces a full quote for a valid request', () => {
    const result = createQuote(baseRequest(), { requestId: 'req_test' });
    expect(result.ok).toBe(true);
    expect(result.requestId).toBe('req_test');
    const q = result.quote;
    expect(q.requestId).toBe('req_test');
    expect(q.destinationId).toBe('santorini');
    expect(q.destinationName).toBe('Santorini');
    expect(q.nights).toBe(3);
    expect(q.currency).toBe('USD');
    // 45000c * 3 nights * 2 rooms = 270000 subtotal
    expect(q.amountsCents.subtotal).toBe(270000);
    expect(q.amountsCents.tax).toBe(Math.round(270000 * 0.12));
    expect(q.amountsCents.total).toBe(270000 + Math.round(270000 * 0.12));
    expect(q.total).toBe('3024.00');
  });

  it('generates a requestId when none is provided', () => {
    const result = createQuote(baseRequest());
    expect(result.requestId).toMatch(/^req_/);
    expect(result.quote.requestId).toBe(result.requestId);
  });

  it('returns a rejection with a stable reason for invalid input', () => {
    const result = createQuote(baseRequest({ email: 'bad' }), { requestId: 'req_x' });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('invalid_email');
    expect(result.requestId).toBe('req_x');
    // Destination was valid, so it is surfaced for log correlation.
    expect(result.destinationId).toBe('santorini');
  });

  it('omits destinationId when the destination itself was invalid', () => {
    const result = createQuote(baseRequest({ destinationId: 'atlantis' }));
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('invalid_destination');
    expect(result.destinationId).toBeUndefined();
  });

  it('never leaks the email into a rejection object', () => {
    const result = createQuote(baseRequest({ guests: 99 }), { requestId: 'req_y' });
    expect(JSON.stringify(result)).not.toContain('traveler@example.com');
  });
});

describe('booking: generateRequestId', () => {
  it('produces unique, prefixed IDs', () => {
    const a = generateRequestId();
    const b = generateRequestId();
    expect(a).toMatch(/^req_/);
    expect(a).not.toBe(b);
  });
});
