import { describe, it, expect } from 'vitest';
import {
  DESTINATIONS,
  isKnownDestination,
  getDestination,
  nightsBetween,
  isNightAvailable,
  isRangeAvailable,
} from '../api/_lib/availability.js';

describe('availability: destinations', () => {
  it('supports exactly the six Wander destinations with stable IDs', () => {
    expect(Object.keys(DESTINATIONS).sort()).toEqual(
      ['amalfi', 'kyoto', 'norway', 'patagonia', 'rajasthan', 'santorini'],
    );
  });

  it('recognizes known and rejects unknown destinations', () => {
    expect(isKnownDestination('kyoto')).toBe(true);
    expect(isKnownDestination('atlantis')).toBe(false);
    expect(getDestination('amalfi').name).toBe('Amalfi Coast');
    expect(getDestination('atlantis')).toBeUndefined();
  });
});

describe('availability: nightsBetween', () => {
  it('returns the occupied nights in a half-open range', () => {
    expect(nightsBetween('2026-09-10', '2026-09-11')).toEqual(['2026-09-10']);
    expect(nightsBetween('2026-09-10', '2026-09-13')).toEqual([
      '2026-09-10',
      '2026-09-11',
      '2026-09-12',
    ]);
  });

  it('crosses month boundaries correctly', () => {
    expect(nightsBetween('2026-09-30', '2026-10-02')).toEqual([
      '2026-09-30',
      '2026-10-01',
    ]);
  });
});

describe('availability: deterministic demo inventory', () => {
  it('marks Kyoto sold out 2026-10-10 through 2026-10-12', () => {
    expect(isNightAvailable('kyoto', '2026-10-10')).toBe(false);
    expect(isNightAvailable('kyoto', '2026-10-11')).toBe(false);
    expect(isNightAvailable('kyoto', '2026-10-12')).toBe(false);
  });

  it('keeps Kyoto available 2026-09-10 through 2026-09-15', () => {
    expect(isRangeAvailable('kyoto', '2026-09-10', '2026-09-15')).toBe(true);
  });

  it('reports a range overlapping a blackout night as unavailable', () => {
    // Nights 10-09..10-11 include the sold-out 10-10 and 10-11.
    expect(isRangeAvailable('kyoto', '2026-10-09', '2026-10-11')).toBe(false);
  });

  it('treats unknown destinations as never available', () => {
    expect(isRangeAvailable('atlantis', '2026-09-10', '2026-09-11')).toBe(false);
  });

  it('leaves other destinations fully available on Kyoto blackout dates', () => {
    expect(isRangeAvailable('amalfi', '2026-10-10', '2026-10-13')).toBe(true);
  });
});
