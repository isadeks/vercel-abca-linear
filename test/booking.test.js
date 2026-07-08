import { describe, it, expect } from 'vitest';
import { createBooking } from '../api/_lib/booking.js';

const existingBookings = [
  { roomId: 'room-1', checkIn: '2024-07-01', checkOut: '2024-07-07' },
];

const validRequest = {
  roomId: 'room-2',
  checkIn: '2024-08-01',
  checkOut: '2024-08-05',
  guestName: 'Bob Jones',
  guestEmail: 'bob@example.com',
  nightlyRate: 200,
};

/** Return a copy of obj with the given keys removed. */
function without(obj, ...keys) {
  const copy = { ...obj };
  for (const key of keys) delete copy[key];
  return copy;
}

describe('createBooking — success path', () => {
  it('returns success: true with a booking object', () => {
    const result = createBooking(validRequest, existingBookings);
    expect(result.success).toBe(true);
    expect(result.booking).toBeDefined();
  });

  it('includes expected fields in the booking object', () => {
    const { booking } = createBooking(validRequest, existingBookings);
    expect(booking).toMatchObject({
      roomId: 'room-2',
      checkIn: '2024-08-01',
      checkOut: '2024-08-05',
      guestName: 'Bob Jones',
      guestEmail: 'bob@example.com',
      nights: 4,
      subtotal: 800,
      tax: 100,    // 800 * 0.125
      total: 900,
    });
  });

  it('generates a booking reference matching BK-XXXXXX pattern', () => {
    const { booking } = createBooking(validRequest, existingBookings);
    expect(booking.bookingRef).toMatch(/^BK-[0-9A-F]{6}$/);
  });

  it('generates a unique booking reference on each call', () => {
    const refs = new Set(
      Array.from({ length: 20 }, () => createBooking(validRequest, existingBookings).booking.bookingRef),
    );
    // With 20 calls and 16M possible values, collision probability is negligible
    expect(refs.size).toBeGreaterThan(1);
  });

  it('respects a custom taxRate', () => {
    const req = { ...validRequest, taxRate: 0.1 };
    const { booking } = createBooking(req, existingBookings);
    // 4 nights * 200 = 800, tax = 80
    expect(booking.tax).toBe(80);
    expect(booking.total).toBe(880);
  });
});

describe('createBooking — failure path', () => {
  it('returns success: false when room is unavailable', () => {
    const req = {
      ...validRequest,
      roomId: 'room-1',
      checkIn: '2024-07-03',
      checkOut: '2024-07-05',
    };
    const result = createBooking(req, existingBookings);
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('returns success: false for a missing guestEmail', () => {
    const result = createBooking(without(validRequest, 'guestEmail'), existingBookings);
    expect(result.success).toBe(false);
    expect(result.errors.some((e) => /guestEmail/.test(e))).toBe(true);
  });

  it('returns success: false for invalid date order', () => {
    const req = { ...validRequest, checkIn: '2024-08-10', checkOut: '2024-08-05' };
    const result = createBooking(req, existingBookings);
    expect(result.success).toBe(false);
    expect(result.errors.some((e) => /checkOut must be after/.test(e))).toBe(true);
  });

  it('returns success: false for a null request', () => {
    const result = createBooking(null, existingBookings);
    expect(result.success).toBe(false);
    expect(Array.isArray(result.errors)).toBe(true);
  });

  it('does not include a booking property on failure', () => {
    const result = createBooking(null, existingBookings);
    expect(result.booking).toBeUndefined();
  });
});
