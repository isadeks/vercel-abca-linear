import { describe, it, expect } from 'vitest';
import {
  validateQuoteRequest,
  MAX_GUESTS_PER_ROOM,
} from '../api/_lib/validation.js';

function baseRequest(overrides = {}) {
  return {
    destinationId: 'amalfi',
    checkIn: '2026-09-10',
    checkOut: '2026-09-15',
    rooms: 1,
    guests: 2,
    email: 'traveler@example.com',
    ...overrides,
  };
}

describe('validation: happy path', () => {
  it('accepts a well-formed request and normalizes the value', () => {
    const result = validateQuoteRequest(baseRequest());
    expect(result.ok).toBe(true);
    expect(result.value).toEqual({
      destinationId: 'amalfi',
      checkIn: '2026-09-10',
      checkOut: '2026-09-15',
      rooms: 1,
      guests: 2,
      email: 'traveler@example.com',
    });
  });
});

describe('validation: rejections', () => {
  it('rejects a non-object body', () => {
    expect(validateQuoteRequest(null).reason).toBe('invalid_body');
    expect(validateQuoteRequest('nope').reason).toBe('invalid_body');
  });

  it('rejects an unknown destination', () => {
    expect(validateQuoteRequest(baseRequest({ destinationId: 'atlantis' })).reason).toBe(
      'invalid_destination',
    );
  });

  it('rejects malformed dates', () => {
    expect(validateQuoteRequest(baseRequest({ checkIn: '09/10/2026' })).reason).toBe(
      'invalid_check_in',
    );
    expect(validateQuoteRequest(baseRequest({ checkOut: 'soon' })).reason).toBe(
      'invalid_check_out',
    );
  });

  it('rejects shape-valid but nonexistent calendar dates', () => {
    expect(validateQuoteRequest(baseRequest({ checkIn: '2026-02-30' })).reason).toBe(
      'invalid_check_in',
    );
  });

  it('rejects reversed and equal date ranges', () => {
    expect(
      validateQuoteRequest(baseRequest({ checkIn: '2026-09-15', checkOut: '2026-09-10' })).reason,
    ).toBe('invalid_date_range');
    expect(
      validateQuoteRequest(baseRequest({ checkIn: '2026-09-10', checkOut: '2026-09-10' })).reason,
    ).toBe('invalid_date_range');
  });

  it('rejects non-positive or non-integer room/guest counts', () => {
    expect(validateQuoteRequest(baseRequest({ rooms: 0 })).reason).toBe('invalid_rooms');
    expect(validateQuoteRequest(baseRequest({ rooms: 1.5 })).reason).toBe('invalid_rooms');
    expect(validateQuoteRequest(baseRequest({ guests: -1 })).reason).toBe('invalid_guests');
    expect(validateQuoteRequest(baseRequest({ guests: 0 })).reason).toBe('invalid_guests');
  });

  it('enforces the max guests-per-room capacity', () => {
    // 1 room * 4 = 4 allowed; 5 exceeds.
    expect(validateQuoteRequest(baseRequest({ rooms: 1, guests: 5 })).reason).toBe(
      'capacity_exceeded',
    );
    // 2 rooms * 4 = 8 allowed; 8 is fine.
    expect(validateQuoteRequest(baseRequest({ rooms: 2, guests: 8 })).ok).toBe(true);
    expect(MAX_GUESTS_PER_ROOM).toBe(4);
  });

  it('rejects malformed emails', () => {
    expect(validateQuoteRequest(baseRequest({ email: 'not-an-email' })).reason).toBe(
      'invalid_email',
    );
    expect(validateQuoteRequest(baseRequest({ email: 'a@b' })).reason).toBe('invalid_email');
    expect(validateQuoteRequest(baseRequest({ email: 42 })).reason).toBe('invalid_email');
  });

  it('rejects sold-out dates', () => {
    const result = validateQuoteRequest(
      baseRequest({ destinationId: 'kyoto', checkIn: '2026-10-10', checkOut: '2026-10-13' }),
    );
    expect(result.reason).toBe('sold_out');
  });
});
