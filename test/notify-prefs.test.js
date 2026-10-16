/**
 * Unit tests for api/_lib/notify-prefs.js
 *
 * Covers: getPrefs, setPrefs, resetPrefs — default values, partial updates,
 * unknown-key filtering, type validation, and reset behaviour.
 */

import { describe, it, expect } from 'vitest';
import { DEFAULTS, getPrefs, setPrefs, resetPrefs } from '../api/_lib/notify-prefs.js';

// Use a fresh unique userId per test group to avoid cross-test state leakage.
let uid = 0;
const nextId = () => `test-user-${++uid}`;

describe('DEFAULTS', () => {
  it('exports a plain object with boolean values', () => {
    expect(typeof DEFAULTS).toBe('object');
    for (const v of Object.values(DEFAULTS)) {
      expect(typeof v).toBe('boolean');
    }
  });

  it('includes expected keys', () => {
    const keys = Object.keys(DEFAULTS);
    expect(keys).toContain('emailBookingConfirmations');
    expect(keys).toContain('emailNewsletters');
    expect(keys).toContain('inAppBookingUpdates');
    expect(keys).toContain('inAppSystemAlerts');
  });
});

describe('getPrefs', () => {
  it('returns a snapshot of DEFAULTS for a new user', () => {
    const prefs = getPrefs(nextId());
    expect(prefs).toEqual(DEFAULTS);
  });

  it('returns a copy, not the DEFAULTS reference', () => {
    const prefs = getPrefs(nextId());
    expect(prefs).not.toBe(DEFAULTS);
  });

  it('throws RangeError for an empty userId', () => {
    expect(() => getPrefs('')).toThrow(RangeError);
  });

  it('throws RangeError for a non-string userId', () => {
    expect(() => getPrefs(null)).toThrow(RangeError);
    expect(() => getPrefs(undefined)).toThrow(RangeError);
    expect(() => getPrefs(42)).toThrow(RangeError);
  });
});

describe('setPrefs', () => {
  it('merges valid boolean updates', () => {
    const id    = nextId();
    const prefs = setPrefs(id, { emailNewsletters: true });
    expect(prefs.emailNewsletters).toBe(true);
    // Other keys keep their defaults
    expect(prefs.emailBookingConfirmations).toBe(DEFAULTS.emailBookingConfirmations);
  });

  it('persists changes so getPrefs returns updated values', () => {
    const id = nextId();
    setPrefs(id, { inAppPromotions: true });
    expect(getPrefs(id).inAppPromotions).toBe(true);
  });

  it('silently ignores unknown keys', () => {
    const id    = nextId();
    const prefs = setPrefs(id, { unknownKey: true });
    expect(prefs).not.toHaveProperty('unknownKey');
  });

  it('throws TypeError when a value is not boolean', () => {
    const id = nextId();
    expect(() => setPrefs(id, { emailNewsletters: 'yes' })).toThrow(TypeError);
    expect(() => setPrefs(id, { emailNewsletters: 1 })).toThrow(TypeError);
  });

  it('throws TypeError when updates is not a plain object', () => {
    const id = nextId();
    expect(() => setPrefs(id, null)).toThrow(TypeError);
    expect(() => setPrefs(id, [true])).toThrow(TypeError);
    expect(() => setPrefs(id, 'bad')).toThrow(TypeError);
  });

  it('throws RangeError for invalid userId', () => {
    expect(() => setPrefs('', {})).toThrow(RangeError);
    expect(() => setPrefs(null, {})).toThrow(RangeError);
  });

  it('accumulates multiple updates correctly', () => {
    const id = nextId();
    setPrefs(id, { emailNewsletters: true });
    setPrefs(id, { emailMarketing: true });
    const prefs = getPrefs(id);
    expect(prefs.emailNewsletters).toBe(true);
    expect(prefs.emailMarketing).toBe(true);
  });
});

describe('resetPrefs', () => {
  it('returns DEFAULTS-equivalent object', () => {
    const id = nextId();
    setPrefs(id, { emailNewsletters: true, inAppPromotions: true });
    const prefs = resetPrefs(id);
    expect(prefs).toEqual(DEFAULTS);
  });

  it('subsequent getPrefs returns DEFAULTS after reset', () => {
    const id = nextId();
    setPrefs(id, { emailNewsletters: true });
    resetPrefs(id);
    expect(getPrefs(id)).toEqual(DEFAULTS);
  });

  it('throws RangeError for invalid userId', () => {
    expect(() => resetPrefs('')).toThrow(RangeError);
  });
});
