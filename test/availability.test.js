import { describe, it, expect } from 'vitest';
import {
  DESTINATIONS,
  getDestination,
  isKnownDestination,
  isAvailable,
} from '../api/_lib/availability.js';

describe('availability: destination catalog', () => {
  it('exposes exactly the six bare destination ids', () => {
    expect(Object.keys(DESTINATIONS).sort()).toEqual(
      ['amalfi', 'kyoto', 'norway', 'patagonia', 'rajasthan', 'santorini'],
    );
  });

  it('resolves a known destination and rejects unknown ones', () => {
    expect(getDestination('kyoto')?.name).toBe('Kyoto');
    expect(isKnownDestination('kyoto')).toBe(true);
    expect(isKnownDestination('atlantis')).toBe(false);
    expect(getDestination(42)).toBeUndefined();
  });
});

describe('availability: demo scenarios', () => {
  it('Kyoto 2026-09-10 -> 2026-09-15 is available', () => {
    expect(isAvailable('kyoto', '2026-09-10', '2026-09-15')).toBe(true);
  });

  it('Kyoto 2026-10-10 -> 2026-10-12 is sold out', () => {
    expect(isAvailable('kyoto', '2026-10-10', '2026-10-12')).toBe(false);
  });

  it('detects any overlap with the sold-out block', () => {
    // Ends exactly at the block start -> available (half-open).
    expect(isAvailable('kyoto', '2026-10-08', '2026-10-10')).toBe(true);
    // Straddles the block start -> sold out.
    expect(isAvailable('kyoto', '2026-10-09', '2026-10-11')).toBe(false);
    // Starts on the last blocked night -> sold out.
    expect(isAvailable('kyoto', '2026-10-12', '2026-10-14')).toBe(false);
    // Starts the day after the block clears -> available.
    expect(isAvailable('kyoto', '2026-10-13', '2026-10-15')).toBe(true);
  });

  it('returns false for unknown destinations', () => {
    expect(isAvailable('atlantis', '2026-09-10', '2026-09-15')).toBe(false);
  });
});
