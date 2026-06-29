import { describe, it, expect } from 'vitest';
import { formatPrice } from '../lib/format-price.js';

describe('formatPrice', () => {
  it('formats 1000 cents as $10.00', () => {
    expect(formatPrice(1000)).toBe('$10.00');
  });

  it('formats 0 cents as $0.00', () => {
    expect(formatPrice(0)).toBe('$0.00');
  });

  it('formats 100 cents as $1.00', () => {
    expect(formatPrice(100)).toBe('$1.00');
  });

  it('formats 199 cents as $1.99', () => {
    expect(formatPrice(199)).toBe('$1.99');
  });

  it('formats 99999 cents as $999.99', () => {
    expect(formatPrice(99999)).toBe('$999.99');
  });

  it('formats large amounts with comma separator', () => {
    expect(formatPrice(100000)).toBe('$1,000.00');
  });
});
