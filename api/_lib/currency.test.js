import { describe, it, expect } from 'vitest';
import { formatUsd } from './currency.js';

describe('formatUsd', () => {
  it('formats a typical cent amount as USD', () => {
    expect(formatUsd(1234)).toBe('$12.34');
  });

  it('formats zero cents as $0.00', () => {
    expect(formatUsd(0)).toBe('$0.00');
  });

  it('formats a whole dollar amount with .00', () => {
    expect(formatUsd(100)).toBe('$1.00');
  });

  it('formats a single cent', () => {
    expect(formatUsd(1)).toBe('$0.01');
  });

  it('formats large amounts with comma separators', () => {
    expect(formatUsd(123456)).toBe('$1,234.56');
  });

  it('formats negative cents as -$X.XX', () => {
    expect(formatUsd(-1234)).toBe('-$12.34');
  });

  it('formats millions of cents with comma separators', () => {
    expect(formatUsd(100000000)).toBe('$1,000,000.00');
  });
});
