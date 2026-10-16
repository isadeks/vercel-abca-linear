/**
 * Tests for js/dark-mode.js
 *
 * The module accesses browser globals (document, localStorage, window).
 * Since Vitest runs in Node we set up minimal stubs on globalThis before
 * each test and tear them down afterwards.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Minimal localStorage stub backed by a plain Map.
 */
function makeLocalStorage() {
  const store = new Map();
  return {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
}

/**
 * Minimal document stub with a single root element that supports
 * getAttribute / setAttribute / removeAttribute on data-theme.
 */
function makeDocument() {
  const attrs = new Map();
  return {
    documentElement: {
      getAttribute: (name) => attrs.get(name) ?? null,
      setAttribute: (name, value) => attrs.set(name, value),
      removeAttribute: (name) => attrs.delete(name),
    },
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('dark-mode module', () => {
  let originalDocument;
  let originalLocalStorage;
  let originalWindow;

  beforeEach(() => {
    // Stash originals
    originalDocument = globalThis.document;
    originalLocalStorage = globalThis.localStorage;
    originalWindow = globalThis.window;

    // Install stubs
    globalThis.document = makeDocument();
    globalThis.localStorage = makeLocalStorage();
    // Default: no system dark-mode preference
    globalThis.window = {
      matchMedia: () => ({ matches: false }),
    };

    // Clear module cache so each test gets a fresh module execution context.
    // (Vitest re-imports the module fresh when the globals change.)
    vi.resetModules();
  });

  afterEach(() => {
    // Restore originals
    globalThis.document = originalDocument;
    globalThis.localStorage = originalLocalStorage;
    globalThis.window = originalWindow;
  });

  // -------------------------------------------------------------------------
  // (a) Preference persisted to localStorage on toggle
  // -------------------------------------------------------------------------
  describe('toggle()', () => {
    it('persists "light" to localStorage when toggling away from dark', async () => {
      const { init, toggle } = await import('../js/dark-mode.js');
      // Start in dark mode by pre-setting localStorage
      globalThis.localStorage.setItem('theme', 'dark');
      init();

      toggle();

      expect(globalThis.localStorage.getItem('theme')).toBe('light');
    });

    it('persists "dark" to localStorage when toggling away from light', async () => {
      const { init, toggle } = await import('../js/dark-mode.js');
      // Start in light mode (default)
      init();

      toggle();

      expect(globalThis.localStorage.getItem('theme')).toBe('dark');
    });

    it('applies data-theme="dark" on document root after toggling to dark', async () => {
      const { init, toggle } = await import('../js/dark-mode.js');
      init(); // starts light
      toggle();

      expect(globalThis.document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('removes data-theme attribute on document root after toggling to light', async () => {
      const { init, toggle } = await import('../js/dark-mode.js');
      globalThis.localStorage.setItem('theme', 'dark');
      init(); // starts dark
      toggle();

      expect(globalThis.document.documentElement.getAttribute('data-theme')).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // (b) Preference restored from localStorage on init
  // -------------------------------------------------------------------------
  describe('init() — restores stored preference', () => {
    it('applies dark theme when localStorage has theme="dark"', async () => {
      const { init } = await import('../js/dark-mode.js');
      globalThis.localStorage.setItem('theme', 'dark');

      init();

      expect(globalThis.document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('does not apply dark theme when localStorage has theme="light"', async () => {
      const { init } = await import('../js/dark-mode.js');
      globalThis.localStorage.setItem('theme', 'light');

      init();

      expect(globalThis.document.documentElement.getAttribute('data-theme')).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // (c) System preference respected when localStorage is empty
  // -------------------------------------------------------------------------
  describe('init() — respects prefers-color-scheme when localStorage is empty', () => {
    it('applies dark theme when OS prefers dark and nothing is stored', async () => {
      // Override window.matchMedia to report dark preference
      globalThis.window = {
        matchMedia: (query) => ({ matches: query === '(prefers-color-scheme: dark)' }),
      };
      const { init } = await import('../js/dark-mode.js');

      init();

      expect(globalThis.document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('does not apply dark theme when OS prefers light and nothing is stored', async () => {
      // matchMedia returns matches=false (default)
      const { init } = await import('../js/dark-mode.js');

      init();

      expect(globalThis.document.documentElement.getAttribute('data-theme')).toBeNull();
    });

    it('stored preference overrides system preference', async () => {
      // OS says dark, but stored says light → should be light
      globalThis.window = {
        matchMedia: (query) => ({ matches: query === '(prefers-color-scheme: dark)' }),
      };
      globalThis.localStorage.setItem('theme', 'light');
      const { init } = await import('../js/dark-mode.js');

      init();

      expect(globalThis.document.documentElement.getAttribute('data-theme')).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // getTheme() helper
  // -------------------------------------------------------------------------
  describe('getTheme()', () => {
    it('returns "dark" when data-theme is set to dark', async () => {
      const { init, getTheme } = await import('../js/dark-mode.js');
      globalThis.localStorage.setItem('theme', 'dark');
      init();

      expect(getTheme()).toBe('dark');
    });

    it('returns "light" when data-theme is not set', async () => {
      const { init, getTheme } = await import('../js/dark-mode.js');
      init(); // defaults to light

      expect(getTheme()).toBe('light');
    });
  });
});
