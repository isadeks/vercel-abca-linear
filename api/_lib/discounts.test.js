import { describe, it, expect } from 'vitest';
import { validateCode, percentFor } from './discounts.js';

describe('validateCode', () => {
  it('returns true for a known code (exact case)', () => {
    expect(validateCode('SAVE10')).toBe(true);
  });

  it('returns true for a known code (lower case)', () => {
    expect(validateCode('save10')).toBe(true);
  });

  it('returns true for a known code (mixed case)', () => {
    expect(validateCode('Save20')).toBe(true);
  });

  it('returns false for an unknown code', () => {
    expect(validateCode('UNKNOWN')).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(validateCode('')).toBe(false);
  });

  it('returns false for a non-string value', () => {
    expect(validateCode(null)).toBe(false);
    expect(validateCode(undefined)).toBe(false);
    expect(validateCode(10)).toBe(false);
  });
});

describe('percentFor', () => {
  it('returns the correct fraction for SAVE10', () => {
    expect(percentFor('SAVE10')).toBe(0.10);
  });

  it('returns the correct fraction for SAVE20', () => {
    expect(percentFor('SAVE20')).toBe(0.20);
  });

  it('returns the correct fraction for SAVE30', () => {
    expect(percentFor('SAVE30')).toBe(0.30);
  });

  it('returns the correct fraction for WELCOME', () => {
    expect(percentFor('WELCOME')).toBe(0.15);
  });

  it('is case-insensitive — lower-case code works', () => {
    expect(percentFor('save10')).toBe(0.10);
  });

  it('is case-insensitive — mixed-case code works', () => {
    expect(percentFor('Save20')).toBe(0.20);
  });

  it('returns null for an unknown code', () => {
    expect(percentFor('NOPE')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(percentFor('')).toBeNull();
  });

  it('returns null for a non-string value', () => {
    expect(percentFor(null)).toBeNull();
    expect(percentFor(undefined)).toBeNull();
    expect(percentFor(42)).toBeNull();
  });
});
