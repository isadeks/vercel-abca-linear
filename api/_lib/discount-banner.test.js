import { describe, it, expect } from 'vitest';
import { bannerText } from './discount-banner.js';

describe('bannerText', () => {
  it('returns banner text for SAVE25', () => {
    expect(bannerText('SAVE25')).toBe('SAVE25 — 25% off');
  });

  it('returns banner text for SAVE10', () => {
    expect(bannerText('SAVE10')).toBe('SAVE10 — 10% off');
  });

  it('returns banner text for SAVE20', () => {
    expect(bannerText('SAVE20')).toBe('SAVE20 — 20% off');
  });

  it('returns banner text for SAVE30', () => {
    expect(bannerText('SAVE30')).toBe('SAVE30 — 30% off');
  });

  it('returns banner text for SAVE50', () => {
    expect(bannerText('SAVE50')).toBe('SAVE50 — 50% off');
  });

  it('returns banner text for WELCOME', () => {
    expect(bannerText('WELCOME')).toBe('WELCOME — 15% off');
  });

  it('is case-insensitive — lower-case code is uppercased in output', () => {
    expect(bannerText('save25')).toBe('SAVE25 — 25% off');
  });

  it('is case-insensitive — mixed-case code is uppercased in output', () => {
    expect(bannerText('Save10')).toBe('SAVE10 — 10% off');
  });

  it('returns empty string for an unknown code', () => {
    expect(bannerText('NOPE')).toBe('');
  });

  it('returns empty string for an empty string', () => {
    expect(bannerText('')).toBe('');
  });

  it('returns empty string when called with no argument', () => {
    expect(bannerText()).toBe('');
  });

  it('returns empty string for null', () => {
    expect(bannerText(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(bannerText(undefined)).toBe('');
  });

  it('returns empty string for a numeric value', () => {
    expect(bannerText(42)).toBe('');
  });
});
