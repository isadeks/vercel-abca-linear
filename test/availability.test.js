import { describe, it, expect } from 'vitest';
import {
  nightsBetween,
  getAvailability,
  isRangeAvailable,
} from '../api/_lib/availability.js';

// ---------------------------------------------------------------------------
// nightsBetween
// ---------------------------------------------------------------------------

describe('nightsBetween', () => {
  it('returns the correct count for a multi-night range', () => {
    expect(nightsBetween('2026-07-01', '2026-07-03')).toBe(2);
  });

  it('returns 1 for adjacent dates', () => {
    expect(nightsBetween('2026-07-01', '2026-07-02')).toBe(1);
  });

  it('returns correct count across a month boundary', () => {
    expect(nightsBetween('2026-06-29', '2026-07-04')).toBe(5);
  });

  it('throws when endDate equals startDate', () => {
    expect(() => nightsBetween('2026-07-01', '2026-07-01')).toThrow(
      /endDate must be after startDate/,
    );
  });

  it('throws when endDate is before startDate', () => {
    expect(() => nightsBetween('2026-07-05', '2026-07-01')).toThrow(
      /endDate must be after startDate/,
    );
  });

  it('throws for a non-ISO startDate', () => {
    expect(() => nightsBetween('July 1', '2026-07-03')).toThrow(/startDate must be an ISO date string/);
  });
});

// ---------------------------------------------------------------------------
// getAvailability — fully-available range
// ---------------------------------------------------------------------------

describe('getAvailability — fully-available range', () => {
  it('returns one entry per night with correct shape', () => {
    const nights = getAvailability('wander-malibu', '2026-08-01', '2026-08-04');
    expect(nights).toHaveLength(3);
    nights.forEach((n) => {
      expect(n).toHaveProperty('date');
      expect(n).toHaveProperty('roomsLeft');
      expect(n).toHaveProperty('nightlyRateUsd');
    });
  });

  it('uses the destination default availability for unoverridden dates', () => {
    const nights = getAvailability('wander-malibu', '2026-08-01', '2026-08-03');
    expect(nights[0]).toMatchObject({ date: '2026-08-01', roomsLeft: 4, nightlyRateUsd: 450 });
    expect(nights[1]).toMatchObject({ date: '2026-08-02', roomsLeft: 4, nightlyRateUsd: 450 });
  });

  it('returns a single night for a one-night stay', () => {
    const nights = getAvailability('wander-smoky-mountains', '2026-06-20', '2026-06-21');
    expect(nights).toHaveLength(1);
    expect(nights[0]).toMatchObject({ date: '2026-06-20', roomsLeft: 6 });
  });
});

// ---------------------------------------------------------------------------
// getAvailability — range containing a sold-out night
// ---------------------------------------------------------------------------

describe('getAvailability — range with a sold-out night', () => {
  it('returns override data for sold-out dates', () => {
    const nights = getAvailability('wander-malibu', '2026-07-03', '2026-07-06');
    // July 3: default (available), July 4: sold out (override), July 5: limited (override)
    expect(nights).toHaveLength(3);
    expect(nights[0]).toMatchObject({ date: '2026-07-03', roomsLeft: 4 });
    expect(nights[1]).toMatchObject({ date: '2026-07-04', roomsLeft: 0, nightlyRateUsd: 650 });
    expect(nights[2]).toMatchObject({ date: '2026-07-05', roomsLeft: 1, nightlyRateUsd: 600 });
  });

  it('reflects sold-out holiday nights for smoky-mountains', () => {
    const nights = getAvailability('wander-smoky-mountains', '2026-12-23', '2026-12-26');
    const soldOut = nights.filter((n) => n.roomsLeft === 0).map((n) => n.date);
    expect(soldOut).toEqual(['2026-12-24', '2026-12-25']);
  });
});

// ---------------------------------------------------------------------------
// isRangeAvailable
// ---------------------------------------------------------------------------

describe('isRangeAvailable', () => {
  it('returns true when every night has sufficient rooms', () => {
    expect(isRangeAvailable('wander-malibu', '2026-08-01', '2026-08-04', 2)).toBe(true);
  });

  it('returns false when a night in the range is sold out', () => {
    // July 4 is sold out (roomsLeft=0)
    expect(isRangeAvailable('wander-malibu', '2026-07-03', '2026-07-06', 1)).toBe(false);
  });

  it('returns false when roomsNeeded exceeds supply on one night', () => {
    // July 5 has only 1 room left
    expect(isRangeAvailable('wander-malibu', '2026-07-05', '2026-07-07', 2)).toBe(false);
  });

  it('returns true when exactly roomsLeft === roomsNeeded', () => {
    // July 5: roomsLeft=1
    expect(isRangeAvailable('wander-malibu', '2026-07-05', '2026-07-06', 1)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Error cases
// ---------------------------------------------------------------------------

describe('error cases', () => {
  it('throws on unknown destination', () => {
    expect(() =>
      getAvailability('wander-nowhere', '2026-07-01', '2026-07-03'),
    ).toThrow(/Unknown destination/);
  });

  it('throws when endDate <= startDate in getAvailability', () => {
    expect(() =>
      getAvailability('wander-malibu', '2026-07-05', '2026-07-03'),
    ).toThrow(/endDate must be after startDate/);
  });

  it('throws when endDate equals startDate in getAvailability', () => {
    expect(() =>
      getAvailability('wander-malibu', '2026-07-05', '2026-07-05'),
    ).toThrow(/endDate must be after startDate/);
  });

  it('throws on unknown destination in isRangeAvailable', () => {
    expect(() =>
      isRangeAvailable('wander-nowhere', '2026-07-01', '2026-07-03', 1),
    ).toThrow(/Unknown destination/);
  });
});
