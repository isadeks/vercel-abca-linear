import { describe, it, expect } from 'vitest';
import { applyDiscountString } from '../lib/discount.js';

describe('applyDiscountString', () => {
  it('returns a dollar string for a 10% discount on $100', () => {
    expect(applyDiscountString(100, 10)).toBe('$90.00');
  });
});
