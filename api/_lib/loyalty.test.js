import { describe, it, expect } from 'vitest';
import { pointsForBooking, POINTS_PER_DOLLAR } from './loyalty.js';

describe('loyalty', () => {
  it('exports POINTS_PER_DOLLAR as 1', () => {
    expect(POINTS_PER_DOLLAR).toBe(1);
  });

  it('returns 0 points for 0 cents', () => {
    expect(pointsForBooking(0)).toBe(0);
  });

  it('returns 0 points for less than 100 cents', () => {
    expect(pointsForBooking(99)).toBe(0);
  });

  it('returns 1 point for exactly 100 cents', () => {
    expect(pointsForBooking(100)).toBe(1);
  });

  it('floors fractional dollars (199 cents → 1 point)', () => {
    expect(pointsForBooking(199)).toBe(1);
  });

  it('returns correct points for a whole-dollar amount (500 cents → 5 points)', () => {
    expect(pointsForBooking(500)).toBe(5);
  });

  it('returns correct points for a large booking (25000 cents → 250 points)', () => {
    expect(pointsForBooking(25000)).toBe(250);
  });
});
