import { describe, it, expect } from 'vitest';
import { applyDiscount } from './pricing-discounts.js';

describe('applyDiscount', () => {
  it('applies SAVE10 (10 %) to a round price', () => {
    expect(applyDiscount(10000, 'SAVE10')).toBe(9000);
  });

  it('applies SAVE20 (20 %) to a round price', () => {
    expect(applyDiscount(10000, 'SAVE20')).toBe(8000);
  });

  it('applies SAVE30 (30 %) to a round price', () => {
    expect(applyDiscount(10000, 'SAVE30')).toBe(7000);
  });

  it('applies SAVE25 (25 %) to a round price', () => {
    expect(applyDiscount(10000, 'SAVE25')).toBe(7500);
  });

  it('applies SAVE50 (50 %) to a round price', () => {
    expect(applyDiscount(10000, 'SAVE50')).toBe(5000);
  });

  it('applies SAVE15 (15 %) to a round price', () => {
    expect(applyDiscount(10000, 'SAVE15')).toBe(8500);
  });

  it('applies WELCOME (15 %) to a round price', () => {
    expect(applyDiscount(10000, 'WELCOME')).toBe(8500);
  });

  it('is case-insensitive — lower-case code works', () => {
    expect(applyDiscount(10000, 'save10')).toBe(9000);
  });

  it('is case-insensitive — mixed-case code works', () => {
    expect(applyDiscount(10000, 'Save20')).toBe(8000);
  });

  it('returns the original price for an unknown code', () => {
    expect(applyDiscount(10000, 'NOPE')).toBe(10000);
  });

  it('returns the original price for an empty string code', () => {
    expect(applyDiscount(10000, '')).toBe(10000);
  });

  it('returns the original price when code is not a string', () => {
    expect(applyDiscount(10000, null)).toBe(10000);
    expect(applyDiscount(10000, undefined)).toBe(10000);
    expect(applyDiscount(10000, 42)).toBe(10000);
  });

  it('rounds fractional cents to the nearest integer', () => {
    // 999 cents × (1 − 0.10) = 899.1 → rounds to 899
    expect(applyDiscount(999, 'SAVE10')).toBe(899);
    // 1001 cents × (1 − 0.30) = 700.7 → rounds to 701
    expect(applyDiscount(1001, 'SAVE30')).toBe(701);
  });

  it('handles a zero price', () => {
    expect(applyDiscount(0, 'SAVE10')).toBe(0);
  });
});
