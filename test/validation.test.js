import { describe, it, expect } from 'vitest';
import { validateBookingRequest } from '../api/_lib/validation.js';

const existingBookings = [
  { roomId: 'room-1', checkIn: '2024-07-01', checkOut: '2024-07-07' },
];

const validRequest = {
  roomId: 'room-2',
  checkIn: '2024-08-01',
  checkOut: '2024-08-05',
  guestName: 'Alice Smith',
  guestEmail: 'alice@example.com',
  nightlyRate: 150,
};

/** Return a copy of validRequest with the given keys removed. */
function without(obj, ...keys) {
  const copy = { ...obj };
  for (const key of keys) delete copy[key];
  return copy;
}

describe('validateBookingRequest — valid input', () => {
  it('returns valid: true for a well-formed request', () => {
    const result = validateBookingRequest(validRequest, existingBookings);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe('validateBookingRequest — missing fields', () => {
  it('errors when roomId is missing', () => {
    const { valid, errors } = validateBookingRequest(without(validRequest, 'roomId'), existingBookings);
    expect(valid).toBe(false);
    expect(errors.some((e) => /roomId/.test(e))).toBe(true);
  });

  it('errors when checkIn is missing', () => {
    const { valid, errors } = validateBookingRequest(without(validRequest, 'checkIn'), existingBookings);
    expect(valid).toBe(false);
    expect(errors.some((e) => /checkIn/.test(e))).toBe(true);
  });

  it('errors when checkOut is missing', () => {
    const { valid, errors } = validateBookingRequest(without(validRequest, 'checkOut'), existingBookings);
    expect(valid).toBe(false);
    expect(errors.some((e) => /checkOut/.test(e))).toBe(true);
  });

  it('errors when guestName is missing', () => {
    const { valid, errors } = validateBookingRequest(without(validRequest, 'guestName'), existingBookings);
    expect(valid).toBe(false);
    expect(errors.some((e) => /guestName/.test(e))).toBe(true);
  });

  it('errors when guestEmail is missing', () => {
    const { valid, errors } = validateBookingRequest(without(validRequest, 'guestEmail'), existingBookings);
    expect(valid).toBe(false);
    expect(errors.some((e) => /guestEmail/.test(e))).toBe(true);
  });
});

describe('validateBookingRequest — date validation', () => {
  it('errors when checkOut equals checkIn', () => {
    const req = { ...validRequest, checkIn: '2024-08-05', checkOut: '2024-08-05' };
    const { valid, errors } = validateBookingRequest(req, existingBookings);
    expect(valid).toBe(false);
    expect(errors.some((e) => /checkOut must be after/.test(e))).toBe(true);
  });

  it('errors when checkOut is before checkIn', () => {
    const req = { ...validRequest, checkIn: '2024-08-10', checkOut: '2024-08-05' };
    const { valid, errors } = validateBookingRequest(req, existingBookings);
    expect(valid).toBe(false);
    expect(errors.some((e) => /checkOut must be after/.test(e))).toBe(true);
  });

  it('errors on non-ISO date format', () => {
    const req = { ...validRequest, checkIn: '01/08/2024' };
    const { valid, errors } = validateBookingRequest(req, existingBookings);
    expect(valid).toBe(false);
    expect(errors.some((e) => /not a valid ISO date/.test(e))).toBe(true);
  });
});

describe('validateBookingRequest — email validation', () => {
  it('errors on invalid email format', () => {
    const req = { ...validRequest, guestEmail: 'not-an-email' };
    const { valid, errors } = validateBookingRequest(req, existingBookings);
    expect(valid).toBe(false);
    expect(errors.some((e) => /not a valid email/.test(e))).toBe(true);
  });

  it('accepts a valid email', () => {
    const req = { ...validRequest, guestEmail: 'guest@hotel.co.uk' };
    const { valid } = validateBookingRequest(req, existingBookings);
    expect(valid).toBe(true);
  });
});

describe('validateBookingRequest — availability', () => {
  it('errors when the requested room is already booked', () => {
    const req = {
      ...validRequest,
      roomId: 'room-1',
      checkIn: '2024-07-03',
      checkOut: '2024-07-05',
    };
    const { valid, errors } = validateBookingRequest(req, existingBookings);
    expect(valid).toBe(false);
    expect(errors.some((e) => /not available/.test(e))).toBe(true);
  });

  it('accepts a booking that starts exactly when an existing booking ends', () => {
    const req = {
      ...validRequest,
      roomId: 'room-1',
      checkIn: '2024-07-07',
      checkOut: '2024-07-10',
    };
    const { valid } = validateBookingRequest(req, existingBookings);
    expect(valid).toBe(true);
  });
});

describe('validateBookingRequest — edge cases', () => {
  it('returns a single structured error when request is null', () => {
    const { valid, errors } = validateBookingRequest(null, existingBookings);
    expect(valid).toBe(false);
    expect(errors).toHaveLength(1);
  });

  it('accumulates multiple errors', () => {
    const { valid, errors } = validateBookingRequest({}, existingBookings);
    expect(valid).toBe(false);
    expect(errors.length).toBeGreaterThan(1);
  });
});
