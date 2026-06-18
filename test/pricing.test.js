import { describe, it, expect } from 'vitest';
import { calculateTax, calculatePrice, TAX_RATE } from '../api/_lib/pricing.js';

describe('TAX_RATE', () => {
  it('is 10 %', () => {
    expect(TAX_RATE).toBe(0.10);
  });
});

describe('calculateTax', () => {
  it('computes 10 % tax on a round subtotal', () => {
    expect(calculateTax(200)).toBe(20);
  });

  it('rounds to 2 decimal places', () => {
    expect(calculateTax(33.33)).toBe(3.33);
  });

  it('returns 0 for a zero subtotal', () => {
    expect(calculateTax(0)).toBe(0);
  });

  it('throws on a negative subtotal', () => {
    expect(() => calculateTax(-1)).toThrow(RangeError);
  });
});

describe('calculatePrice', () => {
  it('returns a full price breakdown for a 3-night stay at €100/night', () => {
    const result = calculatePrice('2024-06-15', '2024-06-18', 100);
    expect(result.nights).toBe(3);
    expect(result.subtotal).toBe(300);
    expect(result.tax).toBe(30);
    expect(result.total).toBe(330);
    expect(result.available).toBe(true);
  });

  it('includes checkIn / checkOut / nightlyRate in the result', () => {
    const result = calculatePrice('2024-07-01', '2024-07-03', 150);
    expect(result.checkIn).toBe('2024-07-01');
    expect(result.checkOut).toBe('2024-07-03');
    expect(result.nightlyRate).toBe(150);
  });

  it('throws when the room is unavailable', () => {
    expect(() =>
      calculatePrice('2024-06-15', '2024-06-18', 100, ['2024-06-16']),
    ).toThrow(/unavailable/);
  });

  it('throws when nightlyRate is zero or negative', () => {
    expect(() => calculatePrice('2024-06-15', '2024-06-18', 0)).toThrow(
      RangeError,
    );
    expect(() => calculatePrice('2024-06-15', '2024-06-18', -50)).toThrow(
      RangeError,
    );
  });
});
