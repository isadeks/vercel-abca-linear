import { describe, it, expect } from 'vitest';
import {
  CHANNELS,
  NOTIFICATION_TYPES,
  FREQUENCIES,
  DEFAULT_CHANNELS,
  createPreferences,
  validatePreferences,
  updatePreferences,
} from '../api/_lib/notifications.js';

// ── createPreferences ─────────────────────────────────────────────────────────

describe('createPreferences', () => {
  it('returns an object with the given userId', () => {
    const prefs = createPreferences('user-1');
    expect(prefs.userId).toBe('user-1');
  });

  it('applies default channel flags', () => {
    const prefs = createPreferences('user-2');
    expect(prefs.channels).toEqual(DEFAULT_CHANNELS);
  });

  it('creates an entry for every notification type', () => {
    const prefs = createPreferences('user-3');
    for (const type of Object.values(NOTIFICATION_TYPES)) {
      expect(prefs.types).toHaveProperty(type);
    }
  });

  it('each type entry has enabled, channels and frequency', () => {
    const prefs = createPreferences('user-4');
    for (const entry of Object.values(prefs.types)) {
      expect(typeof entry.enabled).toBe('boolean');
      expect(Array.isArray(entry.channels)).toBe(true);
      expect(Object.values(FREQUENCIES)).toContain(entry.frequency);
    }
  });

  it('throws when userId is missing', () => {
    expect(() => createPreferences('')).toThrow();
    expect(() => createPreferences(null)).toThrow();
  });

  it('applies caller overrides (shallow)', () => {
    const prefs = createPreferences('user-5', { channels: { email: false, sms: false, push: false } });
    expect(prefs.channels.email).toBe(false);
  });

  it('stamps updatedAt as an ISO string', () => {
    const prefs = createPreferences('user-6');
    expect(() => new Date(prefs.updatedAt)).not.toThrow();
    expect(prefs.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

// ── validatePreferences ───────────────────────────────────────────────────────

describe('validatePreferences', () => {
  it('accepts an empty update payload', () => {
    const result = validatePreferences({});
    expect(result.valid).toBe(true);
  });

  it('accepts a valid channels patch', () => {
    const result = validatePreferences({ channels: { email: false } });
    expect(result.valid).toBe(true);
  });

  it('rejects non-boolean channel values', () => {
    const result = validatePreferences({ channels: { email: 'yes' } });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('channels.email'))).toBe(true);
  });

  it('rejects unknown channel names', () => {
    const result = validatePreferences({ channels: { fax: true } });
    expect(result.valid).toBe(false);
  });

  it('accepts a valid types patch', () => {
    const result = validatePreferences({
      types: {
        [NOTIFICATION_TYPES.NEWSLETTER]: {
          enabled: true,
          frequency: FREQUENCIES.DAILY_DIGEST,
          channels: [CHANNELS.EMAIL],
        },
      },
    });
    expect(result.valid).toBe(true);
  });

  it('rejects unknown notification types', () => {
    const result = validatePreferences({ types: { unknown_type: { enabled: true } } });
    expect(result.valid).toBe(false);
  });

  it('rejects invalid frequency values', () => {
    const result = validatePreferences({
      types: {
        [NOTIFICATION_TYPES.PRICE_DROP]: { frequency: 'sometimes' },
      },
    });
    expect(result.valid).toBe(false);
  });

  it('rejects non-array channels inside a type', () => {
    const result = validatePreferences({
      types: {
        [NOTIFICATION_TYPES.PRICE_DROP]: { channels: 'email' },
      },
    });
    expect(result.valid).toBe(false);
  });

  it('rejects unknown channels inside a type', () => {
    const result = validatePreferences({
      types: {
        [NOTIFICATION_TYPES.PRICE_DROP]: { channels: ['pigeon'] },
      },
    });
    expect(result.valid).toBe(false);
  });

  it('rejects non-object payload', () => {
    expect(validatePreferences(null).valid).toBe(false);
    expect(validatePreferences('string').valid).toBe(false);
  });
});

// ── updatePreferences ─────────────────────────────────────────────────────────

describe('updatePreferences', () => {
  it('merges channel toggles without clobbering unrelated channels', () => {
    const original = createPreferences('user-10');
    const updated  = updatePreferences(original, { channels: { sms: true } });
    expect(updated.channels.sms).toBe(true);
    expect(updated.channels.email).toBe(original.channels.email);
  });

  it('merges a single type patch', () => {
    const original = createPreferences('user-11');
    const updated  = updatePreferences(original, {
      types: {
        [NOTIFICATION_TYPES.NEWSLETTER]: {
          enabled:  true,
          frequency: FREQUENCIES.DAILY_DIGEST,
        },
      },
    });
    expect(updated.types[NOTIFICATION_TYPES.NEWSLETTER].enabled).toBe(true);
    expect(updated.types[NOTIFICATION_TYPES.NEWSLETTER].frequency).toBe(FREQUENCIES.DAILY_DIGEST);
  });

  it('does not mutate the original object', () => {
    const original = createPreferences('user-12');
    const beforeEmail = original.channels.email;
    updatePreferences(original, { channels: { email: !beforeEmail } });
    expect(original.channels.email).toBe(beforeEmail);
  });

  it('updates the updatedAt timestamp', () => {
    const original = createPreferences('user-13');
    const t0 = new Date(original.updatedAt).getTime();
    // small delay to guarantee timestamp differs
    const updated = updatePreferences(original, {});
    const t1 = new Date(updated.updatedAt).getTime();
    expect(t1).toBeGreaterThanOrEqual(t0);
  });

  it('preserves userId after update', () => {
    const original = createPreferences('user-14');
    const updated  = updatePreferences(original, { channels: { push: true } });
    expect(updated.userId).toBe('user-14');
  });

  it('replaces channel array for a type when provided', () => {
    const original = createPreferences('user-15');
    const updated  = updatePreferences(original, {
      types: {
        [NOTIFICATION_TYPES.BOOKING_CONFIRMATION]: {
          channels: [CHANNELS.EMAIL, CHANNELS.SMS],
        },
      },
    });
    expect(updated.types[NOTIFICATION_TYPES.BOOKING_CONFIRMATION].channels).toEqual([
      CHANNELS.EMAIL,
      CHANNELS.SMS,
    ]);
  });
});
