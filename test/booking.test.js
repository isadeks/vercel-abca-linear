import { describe, it, expect } from 'vitest';
import { createBooking } from '../api/_lib/booking.js';
import { quote } from '../api/_lib/pricing.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A baseline valid booking request. */
function validRequest(overrides = {}) {
  return {
    destinationId: 'wander-malibu',
    startDate: '2026-08-01',
    endDate: '2026-08-04',
    rooms: 2,
    guests: 4,
    email: 'traveller@example.com',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Valid request — ok: true
// ---------------------------------------------------------------------------

describe('createBooking — valid request', () => {
  it('returns ok: true for a valid 3-night stay at wander-malibu', () => {
    const result = createBooking(validRequest());
    expect(result.ok).toBe(true);
  });

  it('includes the correct confirmationId derived from request fields', () => {
    const req = validRequest();
    const result = createBooking(req);
    expect(result.ok).toBe(true);
    // Derived ID: <destinationId>-<startDate>-<endDate>-r<rooms>-g<guests>
    expect(result.confirmationId).toBe(
      `${req.destinationId}-${req.startDate}-${req.endDate}-r${req.rooms}-g${req.guests}`,
    );
  });

  it('accepts an optional id override', () => {
    const result = createBooking(validRequest(), 'CUSTOM-ID-123');
    expect(result.ok).toBe(true);
    expect(result.confirmationId).toBe('CUSTOM-ID-123');
  });

  it('echoes back destinationId, startDate, endDate, rooms, guests', () => {
    const req = validRequest();
    const result = createBooking(req);
    expect(result.ok).toBe(true);
    expect(result.destinationId).toBe(req.destinationId);
    expect(result.startDate).toBe(req.startDate);
    expect(result.endDate).toBe(req.endDate);
    expect(result.rooms).toBe(req.rooms);
    expect(result.guests).toBe(req.guests);
  });

  it('quote matches pricing.quote() called with the same inputs', () => {
    const req = validRequest();
    const result = createBooking(req);
    expect(result.ok).toBe(true);

    const expectedQuote = quote(req.destinationId, req.startDate, req.endDate, req.rooms);
    expect(result.quote).toEqual(expectedQuote);
  });

  it('returns correct quote values for a 3-night, 2-room stay at wander-malibu', () => {
    // 3 nights × $450 × 2 rooms = $2700.00 subtotal
    // tax = $2700 × 0.12 = $324.00
    // total = $3024.00
    const result = createBooking(validRequest());
    expect(result.ok).toBe(true);
    expect(result.quote.nights).toBe(3);
    expect(result.quote.roomSubtotalUsd).toBe(2700);
    expect(result.quote.taxesUsd).toBe(324);
    expect(result.quote.totalUsd).toBe(3024);
    expect(result.quote.currency).toBe('USD');
  });

  it('works for a single room, single guest at wander-smoky-mountains', () => {
    const req = validRequest({
      destinationId: 'wander-smoky-mountains',
      startDate: '2026-06-20',
      endDate: '2026-06-22',
      rooms: 1,
      guests: 1,
    });
    const result = createBooking(req);
    expect(result.ok).toBe(true);

    const expectedQuote = quote(req.destinationId, req.startDate, req.endDate, req.rooms);
    expect(result.quote).toEqual(expectedQuote);
    expect(result.quote.nights).toBe(2);
    expect(result.quote.totalUsd).toBe(716.8);
  });
});

// ---------------------------------------------------------------------------
// Invalid request — ok: false
// ---------------------------------------------------------------------------

describe('createBooking — invalid request', () => {
  it('returns ok: false and errors when rooms is invalid', () => {
    const result = createBooking(validRequest({ rooms: 0 }));
    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([expect.stringMatching(/rooms must be/)]),
    );
  });

  it('returns ok: false and errors when email is invalid', () => {
    const result = createBooking(validRequest({ email: 'notanemail' }));
    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([expect.stringMatching(/valid email/)]),
    );
  });

  it('returns ok: false when the date range contains a sold-out night', () => {
    // wander-malibu July 4 is sold out
    const result = createBooking(
      validRequest({ startDate: '2026-07-03', endDate: '2026-07-06', rooms: 1 }),
    );
    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([expect.stringMatching(/not available/)]),
    );
  });

  it('returns ok: false for an unknown destination', () => {
    const result = createBooking(validRequest({ destinationId: 'wander-nowhere' }));
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('accumulates multiple errors for rooms + guests + email all failing', () => {
    const result = createBooking(
      validRequest({ rooms: 0, guests: 0, email: 'bad-email' }),
    );
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/rooms must be/),
        expect.stringMatching(/valid email/),
      ]),
    );
  });

  it('does not include confirmationId or quote on failure', () => {
    const result = createBooking(validRequest({ rooms: 0 }));
    expect(result.ok).toBe(false);
    expect(result).not.toHaveProperty('confirmationId');
    expect(result).not.toHaveProperty('quote');
  });
});
