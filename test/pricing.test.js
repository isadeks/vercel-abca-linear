import { describe, it, expect } from 'vitest';
import { calculateNights, calculatePrice, DEFAULT_TAX_RATE } from '../api/_lib/pricing.js';

describe('DEFAULT_TAX_RATE', () => {
  it('is 0.125 (12.5%)', () => {
    expect(DEFAULT_TAX_RATE).toBe(0.125);
  });
});

describe('calculateNights', () => {
  it('returns 1 for a single-night stay', () => {
    expect(calculateNights('2024-06-01', '2024-06-02')).toBe(1);
  });

  it('returns 7 for a week stay', () => {
    expect(calculateNights('2024-06-01', '2024-06-08')).toBe(7);
  });

  it('returns 30 for a 30-night stay', () => {
    expect(calculateNights('2024-06-01', '2024-07-01')).toBe(30);
  });

  it('throws RangeError when checkOut equals checkIn', () => {
    expect(() => calculateNights('2024-06-05', '2024-06-05')).toThrow(RangeError);
  });

  it('throws RangeError when checkOut is before checkIn', () => {
    expect(() => calculateNights('2024-06-10', '2024-06-05')).toThrow(RangeError);
  });
});

describe('calculatePrice', () => {
  const existingBookings = [
    { roomId: 'room-1', checkIn: '2024-07-01', checkOut: '2024-07-07' },
  ];

  it('calculates correct subtotal, tax, and total for an available room', () => {
    const result = calculatePrice({
      roomId: 'room-2',
      checkIn: '2024-06-01',
      checkOut: '2024-06-04',
      nightlyRate: 200,
      existingBookings,
    });

    expect(result.nights).toBe(3);
    expect(result.subtotal).toBe(600);
    // 600 * 0.125 = 75
    expect(result.tax).toBe(75);
    expect(result.total).toBe(675);
  });

  it('uses DEFAULT_TAX_RATE when taxRate is not provided', () => {
    const result = calculatePrice({
      roomId: 'room-2',
      checkIn: '2024-06-01',
      checkOut: '2024-06-02',
      nightlyRate: 100,
      existingBookings,
    });

    expect(result.tax).toBe(Math.round(100 * DEFAULT_TAX_RATE * 100) / 100);
  });

  it('accepts a custom taxRate', () => {
    const result = calculatePrice({
      roomId: 'room-2',
      checkIn: '2024-06-01',
      checkOut: '2024-06-02',
      nightlyRate: 100,
      taxRate: 0.1,
      existingBookings,
    });

    expect(result.tax).toBe(10);
    expect(result.total).toBe(110);
  });

  it('throws when the room is not available', () => {
    expect(() =>
      calculatePrice({
        roomId: 'room-1',
        checkIn: '2024-07-03',
        checkOut: '2024-07-05',
        nightlyRate: 200,
        existingBookings,
      }),
    ).toThrow(/not available/);
  });

  it('throws RangeError for invalid date range', () => {
    expect(() =>
      calculatePrice({
        roomId: 'room-2',
        checkIn: '2024-06-10',
        checkOut: '2024-06-05',
        nightlyRate: 100,
        existingBookings,
      }),
    ).toThrow(RangeError);
  });

  it('rounds totals to two decimal places', () => {
    const result = calculatePrice({
      roomId: 'room-2',
      checkIn: '2024-06-01',
      checkOut: '2024-06-04',
      nightlyRate: 99.99,
      taxRate: 0.1,
      existingBookings,
    });

    // 3 * 99.99 = 299.97, tax = 29.997 -> rounds to 30, total = 329.97
    expect(result.subtotal).toBe(299.97);
    expect(result.tax).toBe(30);
    expect(result.total).toBe(329.97);
  });
});
