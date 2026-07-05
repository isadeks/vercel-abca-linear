/**
 * test/theme.test.js — Unit tests for the theme persistence and toggle logic.
 *
 * Runs in Node with no browser globals; we stub the minimum needed interfaces
 * (Storage, HTMLElement) rather than pulling in jsdom.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  STORAGE_KEY,
  getStoredTheme,
  setStoredTheme,
  applyTheme,
  toggleTheme,
  resolveInitialTheme,
  updateButton,
} from '../theme.js';

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

// ── Minimal HTMLElement stub ─────────────────────────────────────────────────
function makeElement() {
  const attrs = new Map();
  return {
    attributes: attrs,
    getAttribute: (name) => (attrs.has(name) ? attrs.get(name) : null),
    setAttribute: (name, value) => attrs.set(name, value),
    innerHTML: '',
  };
}

// ── MediaQueryList stub ───────────────────────────────────────────────────────
function makeMql(matches) {
  return { matches };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('STORAGE_KEY', () => {
  it('is a non-empty string', () => {
    expect(typeof STORAGE_KEY).toBe('string');
    expect(STORAGE_KEY.length).toBeGreaterThan(0);
  });
});

describe('getStoredTheme', () => {
  let storage;
  beforeEach(() => { storage = makeStorage(); });

  it('returns null when nothing is stored', () => {
    expect(getStoredTheme(storage)).toBeNull();
  });

  it('returns "light" when stored', () => {
    storage.setItem(STORAGE_KEY, 'light');
    expect(getStoredTheme(storage)).toBe('light');
  });

  it('returns "dark" when stored', () => {
    storage.setItem(STORAGE_KEY, 'dark');
    expect(getStoredTheme(storage)).toBe('dark');
  });

  it('returns null for an unrecognised value', () => {
    storage.setItem(STORAGE_KEY, 'system');
    expect(getStoredTheme(storage)).toBeNull();
  });
});

describe('setStoredTheme', () => {
  let storage;
  beforeEach(() => { storage = makeStorage(); });

  it('persists "light"', () => {
    setStoredTheme(storage, 'light');
    expect(storage.getItem(STORAGE_KEY)).toBe('light');
  });

  it('persists "dark"', () => {
    setStoredTheme(storage, 'dark');
    expect(storage.getItem(STORAGE_KEY)).toBe('dark');
  });

  it('overwrites a previous value', () => {
    setStoredTheme(storage, 'light');
    setStoredTheme(storage, 'dark');
    expect(storage.getItem(STORAGE_KEY)).toBe('dark');
  });
});

describe('applyTheme', () => {
  it('sets data-theme on the root element', () => {
    const root = makeElement();
    applyTheme(root, 'dark');
    expect(root.getAttribute('data-theme')).toBe('dark');
  });

  it('updates data-theme when called again', () => {
    const root = makeElement();
    applyTheme(root, 'dark');
    applyTheme(root, 'light');
    expect(root.getAttribute('data-theme')).toBe('light');
  });
});

describe('toggleTheme', () => {
  it('dark → light', () => {
    expect(toggleTheme('dark')).toBe('light');
  });

  it('light → dark', () => {
    expect(toggleTheme('light')).toBe('dark');
  });
});

describe('resolveInitialTheme', () => {
  let storage;
  beforeEach(() => { storage = makeStorage(); });

  it('returns stored theme when present (overrides OS hint)', () => {
    setStoredTheme(storage, 'light');
    expect(resolveInitialTheme(storage, makeMql(true))).toBe('light');
  });

  it('returns stored "dark" when present', () => {
    setStoredTheme(storage, 'dark');
    expect(resolveInitialTheme(storage, makeMql(false))).toBe('dark');
  });

  it('falls back to OS dark hint when no stored preference', () => {
    expect(resolveInitialTheme(storage, makeMql(true))).toBe('dark');
  });

  it('falls back to "light" when no stored preference and OS is light', () => {
    expect(resolveInitialTheme(storage, makeMql(false))).toBe('light');
  });

  it('falls back to "light" when no stored preference and mql is null', () => {
    expect(resolveInitialTheme(storage, null)).toBe('light');
  });
});

describe('updateButton', () => {
  it('sets aria-label for dark mode (shows sun → switching to light)', () => {
    const btn = makeElement();
    updateButton(btn, 'dark');
    expect(btn.getAttribute('aria-label')).toBe('Switch to light theme');
  });

  it('sets aria-label for light mode (shows moon → switching to dark)', () => {
    const btn = makeElement();
    updateButton(btn, 'light');
    expect(btn.getAttribute('aria-label')).toBe('Switch to dark theme');
  });

  it('sets innerHTML for dark mode (sun icon)', () => {
    const btn = makeElement();
    updateButton(btn, 'dark');
    expect(btn.innerHTML).toContain('<svg');
    expect(btn.innerHTML).toContain('circle'); // sun has a circle
  });

  it('sets innerHTML for light mode (moon icon)', () => {
    const btn = makeElement();
    updateButton(btn, 'light');
    expect(btn.innerHTML).toContain('<svg');
    expect(btn.innerHTML).toContain('path'); // moon uses a path
  });
});

describe('theme persistence round-trip', () => {
  it('stores and retrieves correctly across multiple toggles', () => {
    const storage = makeStorage();
    let theme = resolveInitialTheme(storage, null);
    expect(theme).toBe('light');

    theme = toggleTheme(theme);
    setStoredTheme(storage, theme);
    expect(getStoredTheme(storage)).toBe('dark');

    theme = toggleTheme(theme);
    setStoredTheme(storage, theme);
    expect(getStoredTheme(storage)).toBe('light');

    // Simulate page reload — stored pref should survive
    const onReload = resolveInitialTheme(storage, makeMql(true));
    expect(onReload).toBe('light'); // stored pref wins over OS hint
  });
});
