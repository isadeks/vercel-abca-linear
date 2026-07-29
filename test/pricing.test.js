import { describe, it, expect } from 'vitest';
import { priceQuote, nightsBetween, TAX_RATE, CURRENCY } from '../api/_lib/pricing.js';

describe('pricing: nightsBetween', () => {
  it('counts nights with checkout exclusive', () => {
    expect(nightsBetween('2026-09-10', '2026-09-15')).toBe(5);
    expect(nightsBetween('2026-09-10', '2026-09-11')).toBe(1);
  });
});

describe('pricing: priceQuote', () => {
  it('matches the Kyoto demo quote exactly', () => {
    const quote = priceQuote({
      destinationId: 'kyoto',
      checkIn: '2026-09-10',
      checkOut: '2026-09-15',
      rooms: 1,
    });
    expect(quote).toEqual({
      destinationName: 'Kyoto',
      nights: 5,
      subtotalUsd: 1900,
      taxUsd: 228,
      totalUsd: 2128,
      currency: 'USD',
    });
  });

  it('scales the subtotal by rooms', () => {
    const quote = priceQuote({
      destinationId: 'kyoto',
      checkIn: '2026-09-10',
      checkOut: '2026-09-15',
      rooms: 2,
    });
    expect(quote.subtotalUsd).toBe(3800);
    expect(quote.taxUsd).toBe(456);
    expect(quote.totalUsd).toBe(4256);
  });

  it('uses cent-safe arithmetic (total === subtotal + tax)', () => {
    const quote = priceQuote({
      destinationId: 'rajasthan',
      checkIn: '2026-09-10',
      checkOut: '2026-09-13',
      rooms: 1,
    });
    // 290 * 3 = 870 subtotal; 12% tax = 104.4 -> 104.4 exactly.
    expect(quote.subtotalUsd).toBe(870);
    expect(quote.taxUsd).toBe(104.4);
    expect(quote.totalUsd).toBe(974.4);
    expect(quote.totalUsd).toBe(quote.subtotalUsd + quote.taxUsd);
    expect(quote.currency).toBe(CURRENCY);
  });

  it('applies the documented 12% tax rate', () => {
    expect(TAX_RATE).toBe(0.12);
  });

  it('throws for an unknown destination', () => {
    expect(() =>
      priceQuote({ destinationId: 'atlantis', checkIn: '2026-09-10', checkOut: '2026-09-11', rooms: 1 }),
    ).toThrow();
  });
});
