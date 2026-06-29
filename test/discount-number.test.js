import { describe, it, expect } from 'vitest';
import { applyDiscount } from '../lib/discount.js';

describe('applyDiscount', () => {
  it('returns a number (not a string)', () => {
    const result = applyDiscount(100, 10);
    expect(typeof result).toBe('number');
  });

  it('applyDiscount(100, 10) === 90', () => {
    expect(applyDiscount(100, 10)).toBe(90);
  });

  it('rounds to 2 decimal places', () => {
    expect(applyDiscount(100, 33)).toBe(67);
    expect(applyDiscount(9.99, 10)).toBe(8.99);
  });
});
