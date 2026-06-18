import { describe, it, expect } from 'vitest';
import { parseDate, countNights, checkAvailability } from '../api/_lib/availability.js';

describe('parseDate', () => {
  it('parses a valid ISO date to a UTC Date', () => {
    const d = parseDate('2024-06-15');
    expect(d.toISOString()).toBe('2024-06-15T00:00:00.000Z');
  });

  it('throws on an invalid date string', () => {
    expect(() => parseDate('not-a-date')).toThrow(RangeError);
  });
});

describe('countNights', () => {
  it('returns the correct number of nights', () => {
    expect(countNights('2024-06-15', '2024-06-18')).toBe(3);
  });

  it('returns 1 for a single-night stay', () => {
    expect(countNights('2024-06-15', '2024-06-16')).toBe(1);
  });

  it('throws when checkOut is not after checkIn', () => {
    expect(() => countNights('2024-06-15', '2024-06-15')).toThrow(RangeError);
    expect(() => countNights('2024-06-15', '2024-06-14')).toThrow(RangeError);
  });
});

describe('checkAvailability', () => {
  it('reports available when no dates are blocked', () => {
    const result = checkAvailability('2024-06-15', '2024-06-18');
    expect(result.available).toBe(true);
    expect(result.nights).toBe(3);
    expect(result.blockedNights).toEqual([]);
  });

  it('reports unavailable when a blocked date falls within the stay', () => {
    const result = checkAvailability('2024-06-15', '2024-06-18', ['2024-06-16']);
    expect(result.available).toBe(false);
    expect(result.blockedNights).toContain('2024-06-16');
  });

  it('does not count the checkout day as a blocked night', () => {
    // 2024-06-18 is checkout — the guest leaves that morning, so blocking it
    // should not affect the availability of the prior nights.
    const result = checkAvailability('2024-06-15', '2024-06-18', ['2024-06-18']);
    expect(result.available).toBe(true);
    expect(result.blockedNights).toEqual([]);
  });

  it('counts multiple blocked nights correctly', () => {
    const result = checkAvailability('2024-06-15', '2024-06-20', [
      '2024-06-16',
      '2024-06-18',
    ]);
    expect(result.available).toBe(false);
    expect(result.blockedNights).toHaveLength(2);
  });
});
