/**
 * test/profile.test.js — Unit tests for the profile localStorage helpers.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  PROFILE_KEY,
  DEFAULT_PROFILE,
  loadProfile,
  saveProfile,
  updateDisplayName,
  clearProfile,
} from '../src/profile-store.js';

// ── Minimal in-memory Storage stub ──────────────────────────────────────────
function makeStorage() {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('PROFILE_KEY', () => {
  it('is a non-empty string', () => {
    expect(typeof PROFILE_KEY).toBe('string');
    expect(PROFILE_KEY.length).toBeGreaterThan(0);
  });
});

describe('loadProfile', () => {
  let storage;
  beforeEach(() => { storage = makeStorage(); });

  it('returns defaults when nothing is stored', () => {
    const profile = loadProfile(storage);
    expect(profile).toEqual(DEFAULT_PROFILE);
  });

  it('returns stored values when present', () => {
    storage.setItem(PROFILE_KEY, JSON.stringify({ displayName: 'Jamie Lee' }));
    const profile = loadProfile(storage);
    expect(profile.displayName).toBe('Jamie Lee');
  });

  it('merges missing keys with defaults', () => {
    storage.setItem(PROFILE_KEY, JSON.stringify({ displayName: 'Jamie Lee' }));
    const profile = loadProfile(storage);
    expect(profile.email).toBe(DEFAULT_PROFILE.email);
  });

  it('falls back to defaults when storage contains invalid JSON', () => {
    storage.setItem(PROFILE_KEY, 'not-json');
    const profile = loadProfile(storage);
    expect(profile).toEqual(DEFAULT_PROFILE);
  });

  it('does not mutate DEFAULT_PROFILE', () => {
    const profile = loadProfile(storage);
    profile.displayName = 'Changed';
    expect(DEFAULT_PROFILE.displayName).toBe('Alex Wanderer');
  });
});

describe('saveProfile', () => {
  let storage;
  beforeEach(() => { storage = makeStorage(); });

  it('persists a partial update and returns the merged profile', () => {
    const result = saveProfile(storage, { displayName: 'Taylor' });
    expect(result.displayName).toBe('Taylor');
    expect(result.email).toBe(DEFAULT_PROFILE.email);
  });

  it('persists to storage so a subsequent loadProfile reads it back', () => {
    saveProfile(storage, { displayName: 'Morgan' });
    expect(loadProfile(storage).displayName).toBe('Morgan');
  });
});

describe('updateDisplayName', () => {
  let storage;
  beforeEach(() => { storage = makeStorage(); });

  it('trims whitespace', () => {
    const result = updateDisplayName(storage, '  Sam Smith  ');
    expect(result.displayName).toBe('Sam Smith');
  });

  it('computes initials from the first two words', () => {
    const result = updateDisplayName(storage, 'Jordan River Phoenix');
    expect(result.avatarInitials).toBe('JR');
  });

  it('computes single initial for one-word name', () => {
    const result = updateDisplayName(storage, 'Cher');
    expect(result.avatarInitials).toBe('C');
  });

  it('throws when the trimmed name is empty', () => {
    expect(() => updateDisplayName(storage, '   ')).toThrow();
  });

  it('persists the change', () => {
    updateDisplayName(storage, 'Riley Quinn');
    expect(loadProfile(storage).displayName).toBe('Riley Quinn');
  });
});

describe('clearProfile', () => {
  let storage;
  beforeEach(() => { storage = makeStorage(); });

  it('removes the stored profile so defaults are returned on next load', () => {
    saveProfile(storage, { displayName: 'Temporary' });
    clearProfile(storage);
    expect(loadProfile(storage)).toEqual(DEFAULT_PROFILE);
  });
});
