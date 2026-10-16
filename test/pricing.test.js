import { describe, it, expect } from 'vitest';
import { quote } from '../api/_lib/pricing.js';

// ---------------------------------------------------------------------------
// Multi-night quote — tax math asserted to the cent
// ---------------------------------------------------------------------------

describe('quote — multi-night stay', () => {
  it('returns correct breakdown for a 3-night, 2-room stay at wander-malibu', () => {
    // wander-malibu default: $450/night, 4 rooms left
    // 2026-08-01 to 2026-08-04 = 3 nights, all at default rate ($450)
    // subtotal = 3 × $450 × 2 rooms = $2700.00
    // tax     = $2700.00 × 0.12    = $324.00
    // total   = $2700.00 + $324.00 = $3024.00
    const result = quote('wander-malibu', '2026-08-01', '2026-08-04', 2);
    expect(result.nights).toBe(3);
    expect(result.roomSubtotalUsd).toBe(2700);
    expect(result.taxesUsd).toBe(324);
    expect(result.totalUsd).toBe(3024);
    expect(result.currency).toBe('USD');
  });

  it('returns correct breakdown for a 2-night, 1-room stay at wander-smoky-mountains', () => {
    // wander-smoky-mountains default: $320/night
    // 2026-06-20 to 2026-06-22 = 2 nights, both at default rate
    // subtotal = 2 × $320 × 1 room = $640.00
    // tax     = $640.00 × 0.12    = $76.80
    // total   = $640.00 + $76.80  = $716.80
    const result = quote('wander-smoky-mountains', '2026-06-20', '2026-06-22', 1);
    expect(result.nights).toBe(2);
    expect(result.roomSubtotalUsd).toBe(640);
    expect(result.taxesUsd).toBe(76.8);
    expect(result.totalUsd).toBe(716.8);
    expect(result.currency).toBe('USD');
  });

  it('handles mixed override and default rates correctly', () => {
    // wander-smoky-mountains: Dec 31 override = $520/night, Dec 30 = default $320/night
    // 2026-12-30 to 2026-01-01 = 2 nights, 1 room
    // subtotal = ($320 + $520) × 1 = $840.00
    // tax     = $840.00 × 0.12   = $100.80
    // total   = $840.00 + $100.80 = $940.80
    const result = quote('wander-smoky-mountains', '2026-12-30', '2027-01-01', 1);
    expect(result.nights).toBe(2);
    expect(result.roomSubtotalUsd).toBe(840);
    expect(result.taxesUsd).toBe(100.8);
    expect(result.totalUsd).toBe(940.8);
    expect(result.currency).toBe('USD');
  });
});

// ---------------------------------------------------------------------------
// Single-night quote
// ---------------------------------------------------------------------------

describe('quote — single-night stay', () => {
  it('returns correct breakdown for a 1-night, 1-room stay at wander-malibu', () => {
    // subtotal = 1 × $450 × 1 = $450.00
    // tax     = $450.00 × 0.12 = $54.00
    // total   = $450.00 + $54.00 = $504.00
    const result = quote('wander-malibu', '2026-08-01', '2026-08-02', 1);
    expect(result.nights).toBe(1);
    expect(result.roomSubtotalUsd).toBe(450);
    expect(result.taxesUsd).toBe(54);
    expect(result.totalUsd).toBe(504);
    expect(result.currency).toBe('USD');
  });

  it('returns correct breakdown for a 1-night, 3-room stay at wander-lake-tahoe', () => {
    // wander-lake-tahoe default: $390/night, 3 rooms left
    // subtotal = 1 × $390 × 3 = $1170.00
    // tax     = $1170.00 × 0.12 = $140.40
    // total   = $1170.00 + $140.40 = $1310.40
    const result = quote('wander-lake-tahoe', '2026-06-15', '2026-06-16', 3);
    expect(result.nights).toBe(1);
    expect(result.roomSubtotalUsd).toBe(1170);
    expect(result.taxesUsd).toBe(140.4);
    expect(result.totalUsd).toBe(1310.4);
    expect(result.currency).toBe('USD');
  });
});

// ---------------------------------------------------------------------------
// Not-available throw
// ---------------------------------------------------------------------------

describe('quote — not available', () => {
  it('throws when the range includes a sold-out night', () => {
    // July 4 at wander-malibu is sold out (roomsLeft=0)
    expect(() =>
      quote('wander-malibu', '2026-07-03', '2026-07-06', 1),
    ).toThrow(/not available/i);
  });

  it('throws when roomsNeeded exceeds supply on one night', () => {
    // July 5 at wander-malibu has only 1 room left
    expect(() =>
      quote('wander-malibu', '2026-07-05', '2026-07-07', 2),
    ).toThrow(/not available/i);
  });

  it('throws on unknown destination', () => {
    expect(() =>
      quote('wander-nowhere', '2026-08-01', '2026-08-03', 1),
    ).toThrow(/Unknown destination/);
  });
});
