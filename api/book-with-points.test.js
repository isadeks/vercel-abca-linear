import { describe, it, expect } from 'vitest';
import { handler } from './book-with-points.js';

describe('handler (book-with-points)', () => {
  // Zero price — 0 points, bronze tier
  it('returns 0 points and bronze tier for a 0-cent booking', () => {
    const result = handler({ body: { priceCents: 0 } });
    expect(result).toEqual({ points: 0, tier: 'bronze' });
  });

  // Sub-dollar price — still 0 points (floor), bronze tier
  it('returns 0 points and bronze tier for a 99-cent booking', () => {
    const result = handler({ body: { priceCents: 99 } });
    expect(result).toEqual({ points: 0, tier: 'bronze' });
  });

  // Exactly $1 — 1 point, bronze tier
  it('returns 1 point and bronze tier for a 100-cent booking', () => {
    const result = handler({ body: { priceCents: 100 } });
    expect(result).toEqual({ points: 1, tier: 'bronze' });
  });

  // $50 booking — 50 points, bronze tier (< 100 threshold)
  it('returns 50 points and bronze tier for a 5000-cent booking', () => {
    const result = handler({ body: { priceCents: 5000 } });
    expect(result).toEqual({ points: 50, tier: 'bronze' });
  });

  // $99 booking — 99 points, still bronze (upper boundary)
  it('returns 99 points and bronze tier for a 9999-cent booking', () => {
    const result = handler({ body: { priceCents: 9999 } });
    expect(result).toEqual({ points: 99, tier: 'bronze' });
  });

  // $100 booking — 100 points, silver tier (lower boundary of silver)
  it('returns 100 points and silver tier for a 10000-cent booking', () => {
    const result = handler({ body: { priceCents: 10000 } });
    expect(result).toEqual({ points: 100, tier: 'silver' });
  });

  // $250 booking — 250 points, silver tier
  it('returns 250 points and silver tier for a 25000-cent booking', () => {
    const result = handler({ body: { priceCents: 25000 } });
    expect(result).toEqual({ points: 250, tier: 'silver' });
  });

  // $499 booking — 499 points, silver tier (upper boundary)
  it('returns 499 points and silver tier for a 49999-cent booking', () => {
    const result = handler({ body: { priceCents: 49999 } });
    expect(result).toEqual({ points: 499, tier: 'silver' });
  });

  // $500 booking — 500 points, gold tier (lower boundary of gold)
  it('returns 500 points and gold tier for a 50000-cent booking', () => {
    const result = handler({ body: { priceCents: 50000 } });
    expect(result).toEqual({ points: 500, tier: 'gold' });
  });

  // $1000 booking — 1000 points, gold tier
  it('returns 1000 points and gold tier for a 100000-cent booking', () => {
    const result = handler({ body: { priceCents: 100000 } });
    expect(result).toEqual({ points: 1000, tier: 'gold' });
  });
});
