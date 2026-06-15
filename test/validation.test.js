import { describe, it, expect } from 'vitest';
import { validateBookingRequest } from '../api/_lib/validation.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A baseline valid request that passes every rule. */
function validRequest(overrides = {}) {
  return {
    destinationId: 'wander-malibu',
    startDate: '2026-08-01',
    endDate: '2026-08-05',
    rooms: 2,
    guests: 4,
    email: 'traveller@example.com',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Fully-valid request
// ---------------------------------------------------------------------------

describe('validateBookingRequest — fully valid request', () => {
  it('returns valid=true and an empty errors array', () => {
    const result = validateBookingRequest(validRequest());
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('works for a single room, single guest', () => {
    const result = validateBookingRequest(validRequest({ rooms: 1, guests: 1 }));
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('accepts guests exactly at maximum capacity (rooms × 4)', () => {
    const result = validateBookingRequest(validRequest({ rooms: 3, guests: 12 }));
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Rule: rooms >= 1
// ---------------------------------------------------------------------------

describe('validateBookingRequest — rooms rule', () => {
  it('fails when rooms is 0', () => {
    const result = validateBookingRequest(validRequest({ rooms: 0 }));
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([expect.stringMatching(/rooms must be/)]));
  });

  it('fails when rooms is negative', () => {
    const result = validateBookingRequest(validRequest({ rooms: -1 }));
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([expect.stringMatching(/rooms must be/)]));
  });

  it('fails when rooms is not an integer', () => {
    const result = validateBookingRequest(validRequest({ rooms: 1.5 }));
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([expect.stringMatching(/rooms must be/)]));
  });

  it('fails when rooms is a string', () => {
    const result = validateBookingRequest(validRequest({ rooms: '2' }));
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([expect.stringMatching(/rooms must be/)]));
  });
});

// ---------------------------------------------------------------------------
// Rule: guests >= 1
// ---------------------------------------------------------------------------

describe('validateBookingRequest — guests >= 1 rule', () => {
  it('fails when guests is 0', () => {
    const result = validateBookingRequest(validRequest({ guests: 0 }));
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([expect.stringMatching(/guests must be/)]));
  });

  it('fails when guests is negative', () => {
    const result = validateBookingRequest(validRequest({ guests: -1 }));
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([expect.stringMatching(/guests must be/)]));
  });
});

// ---------------------------------------------------------------------------
// Rule: guests <= rooms * 4
// ---------------------------------------------------------------------------

describe('validateBookingRequest — guests capacity rule', () => {
  it('fails when guests exceeds rooms × 4', () => {
    // rooms=2 → max 8 guests; 9 should fail
    const result = validateBookingRequest(validRequest({ rooms: 2, guests: 9 }));
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([expect.stringMatching(/exceeds maximum capacity/)]),
    );
  });

  it('fails for rooms=1 and guests=5', () => {
    const result = validateBookingRequest(validRequest({ rooms: 1, guests: 5 }));
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([expect.stringMatching(/exceeds maximum capacity/)]),
    );
  });
});

// ---------------------------------------------------------------------------
// Rule: email validation
// ---------------------------------------------------------------------------

describe('validateBookingRequest — email rule', () => {
  it('fails for an email with no @', () => {
    const result = validateBookingRequest(validRequest({ email: 'notanemail' }));
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([expect.stringMatching(/valid email/)]),
    );
  });

  it('fails for an email with no domain dot', () => {
    const result = validateBookingRequest(validRequest({ email: 'user@nodot' }));
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([expect.stringMatching(/valid email/)]),
    );
  });

  it('fails for an empty string email', () => {
    const result = validateBookingRequest(validRequest({ email: '' }));
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([expect.stringMatching(/valid email/)]),
    );
  });

  it('accepts a normal email address', () => {
    const result = validateBookingRequest(validRequest({ email: 'hello+tag@sub.example.co.uk' }));
    expect(result.valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Rule: date range availability
// ---------------------------------------------------------------------------

describe('validateBookingRequest — availability rule', () => {
  it('fails when the date range contains a sold-out night', () => {
    // wander-malibu July 4 is sold out
    const result = validateBookingRequest(
      validRequest({ startDate: '2026-07-03', endDate: '2026-07-06', rooms: 1 }),
    );
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([expect.stringMatching(/not available/)]),
    );
  });

  it('fails when roomsNeeded exceeds supply on a night', () => {
    // wander-malibu July 5 has only 1 room left; requesting 2 fails
    const result = validateBookingRequest(
      validRequest({ startDate: '2026-07-05', endDate: '2026-07-07', rooms: 2 }),
    );
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([expect.stringMatching(/not available/)]),
    );
  });

  it('surfaces an error for an unknown destination', () => {
    const result = validateBookingRequest(validRequest({ destinationId: 'wander-nowhere' }));
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([expect.stringMatching(/availability check failed/)]),
    );
  });

  it('surfaces an error for invalid date format', () => {
    const result = validateBookingRequest(validRequest({ startDate: 'not-a-date' }));
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([expect.stringMatching(/availability check failed/)]),
    );
  });

  it('surfaces an error when endDate <= startDate', () => {
    const result = validateBookingRequest(
      validRequest({ startDate: '2026-08-05', endDate: '2026-08-01' }),
    );
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([expect.stringMatching(/availability check failed/)]),
    );
  });
});

// ---------------------------------------------------------------------------
// Multiple simultaneous failures
// ---------------------------------------------------------------------------

describe('validateBookingRequest — multiple simultaneous failures', () => {
  it('accumulates all errors when rooms, guests, and email all fail', () => {
    const result = validateBookingRequest(
      validRequest({ rooms: 0, guests: 0, email: 'bad-email' }),
    );
    expect(result.valid).toBe(false);
    // Should have at least the rooms error and the email error
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/rooms must be/),
        expect.stringMatching(/valid email/),
      ]),
    );
  });

  it('accumulates availability + email errors together', () => {
    // July 4 sold out AND bad email
    const result = validateBookingRequest({
      destinationId: 'wander-malibu',
      startDate: '2026-07-03',
      endDate: '2026-07-06',
      rooms: 1,
      guests: 1,
      email: 'not-valid',
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/not available/),
        expect.stringMatching(/valid email/),
      ]),
    );
  });

  it('accumulates rooms + guests + email + availability errors', () => {
    const result = validateBookingRequest({
      destinationId: 'wander-nowhere',
      startDate: '2026-07-03',
      endDate: '2026-07-06',
      rooms: 0,
      guests: -1,
      email: 'nope',
    });
    expect(result.valid).toBe(false);
    // At minimum: rooms, guests, email, and availability errors
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/rooms must be/),
        expect.stringMatching(/guests must be/),
        expect.stringMatching(/valid email/),
      ]),
    );
  });
});
