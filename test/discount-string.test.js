import { describe, it, expect } from 'vitest';
import { applyDiscount } from '../lib/discount.js';

describe('applyDiscount', () => {
  it('returns a dollar string for a 10% discount on $100', () => {
    expect(applyDiscount(100, 10)).toBe('$90.00');
  });
});
