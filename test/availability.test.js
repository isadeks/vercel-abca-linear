import { describe, it, expect } from 'vitest';
import {
  isDateInRange,
  nightsBetween,
  isAvailable,
} from '../api/_lib/availability.js';

describe('isDateInRange', () => {
  it('returns true when date is inside the range', () => {
    expect(isDateInRange('2026-07-05', '2026-07-01', '2026-07-10')).toBe(true);
  });

  it('returns true on the start boundary (inclusive)', () => {
    expect(isDateInRange('2026-07-01', '2026-07-01', '2026-07-10')).toBe(true);
  });

  it('returns false on the end boundary (exclusive)', () => {
    expect(isDateInRange('2026-07-10', '2026-07-01', '2026-07-10')).toBe(false);
  });

  it('returns false when date is before range', () => {
    expect(isDateInRange('2026-06-30', '2026-07-01', '2026-07-10')).toBe(false);
  });

  it('returns false when date is after range', () => {
    expect(isDateInRange('2026-07-15', '2026-07-01', '2026-07-10')).toBe(false);
  });
});

describe('nightsBetween', () => {
  it('returns correct number of nights', () => {
    expect(nightsBetween('2026-07-01', '2026-07-05')).toBe(4);
  });

  it('returns 1 for consecutive dates', () => {
    expect(nightsBetween('2026-07-01', '2026-07-02')).toBe(1);
  });

  it('returns 0 when dates are equal', () => {
    expect(nightsBetween('2026-07-01', '2026-07-01')).toBe(0);
  });

  it('returns 0 when check-out is before check-in', () => {
    expect(nightsBetween('2026-07-05', '2026-07-01')).toBe(0);
  });
});

describe('isAvailable', () => {
  const existingBookings = [
    { checkIn: '2026-07-10', checkOut: '2026-07-15' },
    { checkIn: '2026-07-20', checkOut: '2026-07-25' },
  ];

  it('returns true when no bookings exist', () => {
    expect(isAvailable('2026-07-10', '2026-07-15', [])).toBe(true);
  });

  it('returns true for a stay entirely before an existing booking', () => {
    expect(isAvailable('2026-07-01', '2026-07-08', existingBookings)).toBe(true);
  });

  it('returns true for a stay entirely after existing bookings', () => {
    expect(isAvailable('2026-07-26', '2026-07-30', existingBookings)).toBe(true);
  });

  it('returns true for a stay in the gap between two bookings', () => {
    expect(isAvailable('2026-07-15', '2026-07-20', existingBookings)).toBe(true);
  });

  it('returns false when stay overlaps start of an existing booking', () => {
    expect(isAvailable('2026-07-08', '2026-07-12', existingBookings)).toBe(false);
  });

  it('returns false when stay overlaps end of an existing booking', () => {
    expect(isAvailable('2026-07-13', '2026-07-18', existingBookings)).toBe(false);
  });

  it('returns false when stay is entirely within an existing booking', () => {
    expect(isAvailable('2026-07-11', '2026-07-14', existingBookings)).toBe(false);
  });

  it('returns false when stay spans multiple existing bookings', () => {
    expect(isAvailable('2026-07-09', '2026-07-26', existingBookings)).toBe(false);
  });

  it('returns false for a zero-night stay (same day check-in/out)', () => {
    expect(isAvailable('2026-07-01', '2026-07-01', [])).toBe(false);
  });
});
