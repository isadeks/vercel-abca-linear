/**
 * notifications.js — per-user notification-preference domain logic.
 *
 * Framework-free ES module; consumed by api/notification-preferences.js.
 *
 * Data model
 * ----------
 * A UserPreferences object has the shape:
 *
 *   {
 *     userId:   string,
 *     channels: { email: boolean, sms: boolean, push: boolean },
 *     types: {
 *       [NOTIFICATION_TYPE]: {
 *         enabled:   boolean,
 *         channels:  string[]   // subset of CHANNELS values
 *         frequency: string     // one of FREQUENCIES values
 *       }
 *     },
 *     updatedAt: string  // ISO-8601
 *   }
 */

// ── Enumerations ──────────────────────────────────────────────────────────────

export const CHANNELS = Object.freeze({
  EMAIL: 'email',
  SMS:   'sms',
  PUSH:  'push',
});

export const NOTIFICATION_TYPES = Object.freeze({
  BOOKING_CONFIRMATION: 'booking_confirmation',
  BOOKING_REMINDER:     'booking_reminder',
  PRICE_DROP:           'price_drop',
  NEWSLETTER:           'newsletter',
  TRAVEL_TIPS:          'travel_tips',
  ACCOUNT_SECURITY:     'account_security',
});

export const FREQUENCIES = Object.freeze({
  IMMEDIATE:    'immediate',
  DAILY_DIGEST: 'daily_digest',
  WEEKLY_DIGEST:'weekly_digest',
  NEVER:        'never',
});

// ── Defaults ──────────────────────────────────────────────────────────────────

/** Channel-level defaults: which delivery channels are active for a new user. */
export const DEFAULT_CHANNELS = Object.freeze({
  email: true,
  sms:   false,
  push:  false,
});

/** Per-notification-type defaults. */
const TYPE_DEFAULTS = {
  [NOTIFICATION_TYPES.BOOKING_CONFIRMATION]: {
    enabled:   true,
    channels:  [CHANNELS.EMAIL],
    frequency: FREQUENCIES.IMMEDIATE,
  },
  [NOTIFICATION_TYPES.BOOKING_REMINDER]: {
    enabled:   true,
    channels:  [CHANNELS.EMAIL],
    frequency: FREQUENCIES.IMMEDIATE,
  },
  [NOTIFICATION_TYPES.PRICE_DROP]: {
    enabled:   true,
    channels:  [CHANNELS.EMAIL],
    frequency: FREQUENCIES.DAILY_DIGEST,
  },
  [NOTIFICATION_TYPES.NEWSLETTER]: {
    enabled:   false,
    channels:  [CHANNELS.EMAIL],
    frequency: FREQUENCIES.WEEKLY_DIGEST,
  },
  [NOTIFICATION_TYPES.TRAVEL_TIPS]: {
    enabled:   false,
    channels:  [CHANNELS.EMAIL],
    frequency: FREQUENCIES.WEEKLY_DIGEST,
  },
  [NOTIFICATION_TYPES.ACCOUNT_SECURITY]: {
    enabled:   true,
    channels:  [CHANNELS.EMAIL, CHANNELS.SMS],
    frequency: FREQUENCIES.IMMEDIATE,
  },
};

// ── Factory ───────────────────────────────────────────────────────────────────

/**
 * Build a fresh UserPreferences object for the given userId.
 * Optional `overrides` are shallow-merged into the top-level object after
 * defaults are applied.
 *
 * @param {string} userId
 * @param {Partial<UserPreferences>} [overrides]
 * @returns {UserPreferences}
 */
export function createPreferences(userId, overrides = {}) {
  if (!userId || typeof userId !== 'string') {
    throw new Error('userId must be a non-empty string');
  }

  const base = {
    userId,
    channels: { ...DEFAULT_CHANNELS },
    types: Object.fromEntries(
      Object.values(NOTIFICATION_TYPES).map(type => [
        type,
        {
          ...TYPE_DEFAULTS[type],
          channels: [...TYPE_DEFAULTS[type].channels],
        },
      ]),
    ),
    updatedAt: new Date().toISOString(),
  };

  return { ...base, ...overrides, userId };
}

// ── Validation ────────────────────────────────────────────────────────────────

/**
 * Validate a preferences update payload.
 * Returns `{ valid: true }` or `{ valid: false, errors: string[] }`.
 *
 * @param {unknown} payload
 * @returns {{ valid: boolean, errors?: string[] }}
 */
export function validatePreferences(payload) {
  const errors = [];

  if (payload === null || typeof payload !== 'object') {
    return { valid: false, errors: ['payload must be an object'] };
  }

  // channels block (optional in update)
  if ('channels' in payload) {
    const ch = payload.channels;
    if (typeof ch !== 'object' || ch === null) {
      errors.push('channels must be an object');
    } else {
      for (const key of Object.keys(ch)) {
        if (!Object.values(CHANNELS).includes(key)) {
          errors.push(`unknown channel: ${key}`);
        } else if (typeof ch[key] !== 'boolean') {
          errors.push(`channels.${key} must be a boolean`);
        }
      }
    }
  }

  // types block (optional in update)
  if ('types' in payload) {
    const types = payload.types;
    if (typeof types !== 'object' || types === null) {
      errors.push('types must be an object');
    } else {
      for (const [typeName, typePref] of Object.entries(types)) {
        if (!Object.values(NOTIFICATION_TYPES).includes(typeName)) {
          errors.push(`unknown notification type: ${typeName}`);
          continue;
        }
        if (typeof typePref !== 'object' || typePref === null) {
          errors.push(`types.${typeName} must be an object`);
          continue;
        }
        if ('enabled' in typePref && typeof typePref.enabled !== 'boolean') {
          errors.push(`types.${typeName}.enabled must be a boolean`);
        }
        if ('frequency' in typePref) {
          if (!Object.values(FREQUENCIES).includes(typePref.frequency)) {
            errors.push(
              `types.${typeName}.frequency must be one of: ${Object.values(FREQUENCIES).join(', ')}`,
            );
          }
        }
        if ('channels' in typePref) {
          if (!Array.isArray(typePref.channels)) {
            errors.push(`types.${typeName}.channels must be an array`);
          } else {
            for (const ch of typePref.channels) {
              if (!Object.values(CHANNELS).includes(ch)) {
                errors.push(
                  `types.${typeName}.channels contains unknown channel: ${ch}`,
                );
              }
            }
          }
        }
      }
    }
  }

  return errors.length === 0 ? { valid: true } : { valid: false, errors };
}

// ── Merge ─────────────────────────────────────────────────────────────────────

/**
 * Apply `updates` on top of an existing UserPreferences object.
 * Performs a deep merge on `channels` and each entry in `types`; all other
 * top-level keys in `updates` are ignored to avoid accidental clobbering of
 * `userId`.
 *
 * @param {UserPreferences} existing
 * @param {Partial<UserPreferences>} updates
 * @returns {UserPreferences}
 */
export function updatePreferences(existing, updates) {
  const next = {
    ...existing,
    updatedAt: new Date().toISOString(),
  };

  if (updates.channels) {
    next.channels = { ...existing.channels, ...updates.channels };
  }

  if (updates.types) {
    next.types = { ...existing.types };
    for (const [typeName, typePatch] of Object.entries(updates.types)) {
      if (next.types[typeName]) {
        next.types[typeName] = {
          ...next.types[typeName],
          ...typePatch,
          // preserve array identity so we always store a real array
          channels: typePatch.channels
            ? [...typePatch.channels]
            : next.types[typeName].channels,
        };
      }
    }
  }

  return next;
}
