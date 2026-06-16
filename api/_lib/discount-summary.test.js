import { describe, it, expect } from 'vitest';
import { summarize } from './discount-summary.js';

describe('summarize', () => {
  it('returns a human-readable string for SAVE25', () => {
    expect(summarize('SAVE25')).toBe('SAVE25 — 25% off');
  });

  it('returns a human-readable string for SAVE5', () => {
    expect(summarize('SAVE5')).toBe('SAVE5 — 5% off');
  });

  it('returns a human-readable string for SAVE10', () => {
    expect(summarize('SAVE10')).toBe('SAVE10 — 10% off');
  });

  it('returns a human-readable string for SAVE20', () => {
    expect(summarize('SAVE20')).toBe('SAVE20 — 20% off');
  });

  it('returns a human-readable string for SAVE30', () => {
    expect(summarize('SAVE30')).toBe('SAVE30 — 30% off');
  });

  it('returns a human-readable string for SAVE50', () => {
    expect(summarize('SAVE50')).toBe('SAVE50 — 50% off');
  });

  it('returns a human-readable string for SAVE99', () => {
    expect(summarize('SAVE99')).toBe('SAVE99 — 99% off');
  });

  it('returns a human-readable string for SAVE15', () => {
    expect(summarize('SAVE15')).toBe('SAVE15 — 15% off');
  });

  it('returns a human-readable string for WELCOME', () => {
    expect(summarize('WELCOME')).toBe('WELCOME — 15% off');
  });

  it('is case-insensitive — lower-case code is uppercased in output', () => {
    expect(summarize('save25')).toBe('SAVE25 — 25% off');
  });

  it('is case-insensitive — mixed-case code is uppercased in output', () => {
    expect(summarize('Save10')).toBe('SAVE10 — 10% off');
  });

  it('returns "no discount" for an unknown code', () => {
    expect(summarize('NOPE')).toBe('no discount');
  });

  it('returns "no discount" for an empty string', () => {
    expect(summarize('')).toBe('no discount');
  });

  it('returns "no discount" for null', () => {
    expect(summarize(null)).toBe('no discount');
  });

  it('returns "no discount" for a non-string value', () => {
    expect(summarize(undefined)).toBe('no discount');
    expect(summarize(42)).toBe('no discount');
  });
});
