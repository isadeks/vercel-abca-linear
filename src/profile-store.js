/**
 * profile-store.js — localStorage read/write helpers for the profile page.
 *
 * Exported as pure functions so they can be unit-tested without a browser
 * context.  The profile.html page imports and calls these at runtime; the
 * test suite stubs `storage` with a minimal in-memory implementation.
 */

export const PROFILE_KEY = 'wander-profile';

/** @typedef {{ displayName: string, email: string, avatarInitials: string }} Profile */

/** @type {Profile} */
export const DEFAULT_PROFILE = {
  displayName: 'Alex Wanderer',
  email: 'alex@example.com',
  avatarInitials: 'AW',
};

/**
 * Load the profile from storage, merging any missing keys with defaults.
 * @param {Storage} storage
 * @returns {Profile}
 */
export function loadProfile(storage) {
  const raw = storage.getItem(PROFILE_KEY);
  if (!raw) return { ...DEFAULT_PROFILE };
  try {
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PROFILE, ...parsed };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

/**
 * Persist a full or partial profile update.
 * @param {Storage} storage
 * @param {Partial<Profile>} updates
 * @returns {Profile}  the merged, saved profile
 */
export function saveProfile(storage, updates) {
  const current = loadProfile(storage);
  const next = { ...current, ...updates };
  storage.setItem(PROFILE_KEY, JSON.stringify(next));
  return next;
}

/**
 * Update just the display name.
 * Trims whitespace; throws if the result is empty.
 * @param {Storage} storage
 * @param {string} rawName
 * @returns {Profile}
 */
export function updateDisplayName(storage, rawName) {
  const trimmed = rawName.trim();
  if (!trimmed) throw new Error('Display name cannot be empty.');
  const initials = trimmed
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
  return saveProfile(storage, { displayName: trimmed, avatarInitials: initials });
}

/**
 * Reset the profile to defaults (clears storage key).
 * @param {Storage} storage
 */
export function clearProfile(storage) {
  storage.removeItem(PROFILE_KEY);
}
