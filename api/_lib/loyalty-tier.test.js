import { describe, it, expect } from 'vitest';
import { tierFor } from './loyalty-tier.js';

describe('tierFor', () => {
  // bronze: points < 100
  it('returns bronze for 0 points', () => {
    expect(tierFor(0)).toBe('bronze');
  });

  it('returns bronze for 1 point', () => {
    expect(tierFor(1)).toBe('bronze');
  });

  it('returns bronze for 99 points (upper boundary of bronze)', () => {
    expect(tierFor(99)).toBe('bronze');
  });

  // silver: points >= 100 and < 500
  it('returns silver for 100 points (lower boundary of silver)', () => {
    expect(tierFor(100)).toBe('silver');
  });

  it('returns silver for 101 points', () => {
    expect(tierFor(101)).toBe('silver');
  });

  it('returns silver for 499 points (upper boundary of silver)', () => {
    expect(tierFor(499)).toBe('silver');
  });

  // gold: points >= 500
  it('returns gold for 500 points (lower boundary of gold)', () => {
    expect(tierFor(500)).toBe('gold');
  });

  it('returns gold for 501 points', () => {
    expect(tierFor(501)).toBe('gold');
  });

  it('returns gold for a large points balance (10000 points)', () => {
    expect(tierFor(10000)).toBe('gold');
  });
});
