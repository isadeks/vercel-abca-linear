import { describe, it, expect } from 'vitest';
import { formatCurrency, isNonEmptyString, calculateNights } from '../api/_lib/helpers.js';

describe('formatCurrency', () => {
  it('formats a USD amount with default currency', () => {
    expect(formatCurrency(1234.5)).toBe('$1,234.50');
  });

  it('formats a EUR amount', () => {
    expect(formatCurrency(99, 'EUR')).toBe('€99.00');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });
});

describe('isNonEmptyString', () => {
  it('returns true for a plain string', () => {
    expect(isNonEmptyString('hello')).toBe(true);
  });

  it('returns false for an empty string', () => {
    expect(isNonEmptyString('')).toBe(false);
  });

  it('returns false for a whitespace-only string', () => {
    expect(isNonEmptyString('   ')).toBe(false);
  });

  it('returns false for non-string types', () => {
    expect(isNonEmptyString(42)).toBe(false);
    expect(isNonEmptyString(null)).toBe(false);
    expect(isNonEmptyString(undefined)).toBe(false);
  });
});

describe('calculateNights', () => {
  it('returns 1 for a one-night stay', () => {
    expect(calculateNights('2024-06-01', '2024-06-02')).toBe(1);
  });

  it('returns 7 for a week-long stay', () => {
    expect(calculateNights('2024-06-01', '2024-06-08')).toBe(7);
  });

  it('returns 0 when check-out equals check-in', () => {
    expect(calculateNights('2024-06-01', '2024-06-01')).toBe(0);
  });

  it('returns 0 when check-out is before check-in', () => {
    expect(calculateNights('2024-06-08', '2024-06-01')).toBe(0);
  });

  it('works with Date objects', () => {
    expect(calculateNights(new Date('2024-03-10'), new Date('2024-03-15'))).toBe(5);
  });

  it('handles month boundaries correctly', () => {
    expect(calculateNights('2024-01-29', '2024-02-02')).toBe(4);
  });
});
