/**
 * notify-prefs.js — per-user notification preferences
 *
 * Framework-free ES module consumed by api/notify/prefs.js.
 * Uses an in-memory Map as the backing store (suitable for a stateless
 * serverless function demo; swap for a real DB adapter as needed).
 */

/** @type {Record<string, boolean>} */
export const DEFAULTS = {
  emailBookingConfirmations: true,
  emailNewsletters:          false,
  emailMarketing:            false,
  inAppBookingUpdates:       true,
  inAppSystemAlerts:         true,
  inAppPromotions:           false,
};

// In-memory store: userId → preferences snapshot
const store = new Map();

/**
 * Return the preferences for a user, falling back to DEFAULTS for any missing
 * key. Always returns a plain object (never a Map reference).
 *
 * @param {string} userId
 * @returns {typeof DEFAULTS}
 */
export function getPrefs(userId) {
  if (!userId || typeof userId !== 'string') {
    throw new RangeError('userId must be a non-empty string');
  }
  const saved = store.get(userId) ?? {};
  return { ...DEFAULTS, ...saved };
}

/**
 * Merge `updates` into the stored preferences for a user.
 * Only keys that exist in DEFAULTS are accepted; unknown keys are ignored.
 * Values must be booleans.
 *
 * @param {string} userId
 * @param {Partial<typeof DEFAULTS>} updates
 * @returns {typeof DEFAULTS} merged preferences after update
 */
export function setPrefs(userId, updates) {
  if (!userId || typeof userId !== 'string') {
    throw new RangeError('userId must be a non-empty string');
  }
  if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
    throw new TypeError('updates must be a plain object');
  }

  const current = getPrefs(userId);
  const merged  = { ...current };

  for (const [key, value] of Object.entries(updates)) {
    if (!(key in DEFAULTS)) continue;           // ignore unknown keys
    if (typeof value !== 'boolean') {
      throw new TypeError(`Preference "${key}" must be a boolean`);
    }
    merged[key] = value;
  }

  store.set(userId, merged);
  return { ...merged };
}

/**
 * Reset a user's preferences back to DEFAULTS and remove them from the store.
 *
 * @param {string} userId
 * @returns {typeof DEFAULTS}
 */
export function resetPrefs(userId) {
  if (!userId || typeof userId !== 'string') {
    throw new RangeError('userId must be a non-empty string');
  }
  store.delete(userId);
  return { ...DEFAULTS };
}
