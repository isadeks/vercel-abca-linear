import { describe, it, expect } from 'vitest';
import { formatPrice } from '../lib/format-price.js';

describe('formatPrice', () => {
  it('formats 1000 cents as "10 USD"', () => {
    expect(formatPrice(1000)).toBe('10 USD');
  });
});
