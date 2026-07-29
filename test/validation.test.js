import { describe, it, expect } from 'vitest';
import {
  validateBookingRequest,
  parseIsoDate,
  MAX_GUESTS_PER_ROOM,
} from '../api/_lib/validation.js';

const valid = () => ({
  destinationId: 'kyoto',
  checkIn: '2026-09-10',
  checkOut: '2026-09-15',
  rooms: 1,
  guests: 2,
  email: 'demo@example.com',
});

describe('validation: parseIsoDate', () => {
  it('accepts real ISO dates', () => {
    expect(parseIsoDate('2026-09-10')).toBeInstanceOf(Date);
  });

  it('rejects impossible or malformed dates', () => {
    expect(parseIsoDate('2026-02-30')).toBeNull();
    expect(parseIsoDate('2026-13-01')).toBeNull();
    expect(parseIsoDate('2026-9-1')).toBeNull();
    expect(parseIsoDate('not-a-date')).toBeNull();
    expect(parseIsoDate(20260910)).toBeNull();
  });
});

describe('validation: happy path', () => {
  it('accepts and normalizes a valid request', () => {
    const result = validateBookingRequest(valid());
    expect(result.ok).toBe(true);
    expect(result.value).toMatchObject({ destinationId: 'kyoto', rooms: 1, guests: 2 });
  });
});

describe('validation: rejections', () => {
  it('rejects a non-object body', () => {
    expect(validateBookingRequest(null).error.code).toBe('invalid_body');
    expect(validateBookingRequest('nope').error.code).toBe('invalid_body');
    expect(validateBookingRequest([]).error.code).toBe('invalid_body');
  });

  it('rejects unknown destinations', () => {
    expect(validateBookingRequest({ ...valid(), destinationId: 'atlantis' }).error.code)
      .toBe('unknown_destination');
  });

  it('rejects invalid dates and bad ordering', () => {
    expect(validateBookingRequest({ ...valid(), checkIn: '2026-02-30' }).error.code)
      .toBe('invalid_dates');
    expect(validateBookingRequest({ ...valid(), checkOut: '2026-09-10' }).error.code)
      .toBe('invalid_dates');
    expect(validateBookingRequest({ ...valid(), checkIn: '2026-09-16' }).error.code)
      .toBe('invalid_dates');
  });

  it('rejects non-positive / non-integer rooms and guests', () => {
    expect(validateBookingRequest({ ...valid(), rooms: 0 }).error.code).toBe('invalid_rooms');
    expect(validateBookingRequest({ ...valid(), rooms: 1.5 }).error.code).toBe('invalid_rooms');
    expect(validateBookingRequest({ ...valid(), guests: -1 }).error.code).toBe('invalid_guests');
    expect(validateBookingRequest({ ...valid(), guests: '2' }).error.code).toBe('invalid_guests');
  });

  it('rejects more than four guests per room', () => {
    expect(validateBookingRequest({ ...valid(), rooms: 1, guests: 5 }).error.code)
      .toBe('too_many_guests');
    // Two rooms allow up to eight guests.
    expect(validateBookingRequest({ ...valid(), rooms: 2, guests: 8 }).ok).toBe(true);
    expect(validateBookingRequest({ ...valid(), rooms: 2, guests: 9 }).error.code)
      .toBe('too_many_guests');
    expect(MAX_GUESTS_PER_ROOM).toBe(4);
  });

  it('rejects malformed emails', () => {
    for (const email of ['nope', 'a@b', 'a b@c.com', '@example.com', 'x@example']) {
      expect(validateBookingRequest({ ...valid(), email }).error.code).toBe('invalid_email');
    }
  });

  it('rejects sold-out dates', () => {
    const result = validateBookingRequest({
      ...valid(),
      checkIn: '2026-10-10',
      checkOut: '2026-10-12',
    });
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe('sold_out');
    expect(result.error.message).toBe('The selected dates are not available.');
  });
});
