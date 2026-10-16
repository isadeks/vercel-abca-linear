/**
 * theme.js — Light/dark theme toggle with localStorage persistence.
 *
 * Reads the user's stored preference from localStorage and applies it by
 * setting a `data-theme` attribute on <html>.  The toggle button cycles
 * between "light" and "dark" and updates storage on every change.
 *
 * Exported for testing; also auto-initialises when loaded in a browser.
 */

export const STORAGE_KEY = 'wander-theme';
export const THEMES = /** @type {const} */ (['light', 'dark']);

/**
 * Return the persisted theme, or null if none is stored.
 * @param {Storage} storage
 * @returns {'light'|'dark'|null}
 */
export function getStoredTheme(storage) {
  const value = storage.getItem(STORAGE_KEY);
  if (value === 'light' || value === 'dark') return value;
  return null;
}

/**
 * Persist a theme choice.
 * @param {Storage} storage
 * @param {'light'|'dark'} theme
 */
export function setStoredTheme(storage, theme) {
  storage.setItem(STORAGE_KEY, theme);
}

/**
 * Apply `data-theme` attribute to the document root element.
 * @param {HTMLElement} root  — typically document.documentElement
 * @param {'light'|'dark'} theme
 */
export function applyTheme(root, theme) {
  root.setAttribute('data-theme', theme);
}

/**
 * Return the opposite theme.
 * @param {'light'|'dark'} theme
 * @returns {'light'|'dark'}
 */
export function toggleTheme(theme) {
  return theme === 'dark' ? 'light' : 'dark';
}

/**
 * Resolve the initial theme:
 *   1. Stored user preference (highest priority)
 *   2. OS/browser prefers-color-scheme hint
 *   3. Fall back to 'light'
 *
 * @param {Storage} storage
 * @param {MediaQueryList|null} mql  — window.matchMedia('(prefers-color-scheme: dark)')
 * @returns {'light'|'dark'}
 */
export function resolveInitialTheme(storage, mql) {
  const stored = getStoredTheme(storage);
  if (stored) return stored;
  if (mql && mql.matches) return 'dark';
  return 'light';
}

/**
 * Update the toggle button's visible label and accessible label.
 * @param {HTMLElement} btn
 * @param {'light'|'dark'} currentTheme
 */
export function updateButton(btn, currentTheme) {
  const isDark = currentTheme === 'dark';
  btn.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
  btn.setAttribute('title',      isDark ? 'Switch to light theme' : 'Switch to dark theme');
  // Swap icon: moon in light mode (click → go dark), sun in dark mode (click → go light)
  btn.innerHTML = isDark
    ? /* sun icon */  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
    : /* moon icon */ '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
}

/**
 * Initialise the theme toggle.  Called automatically when the script is loaded
 * as a module in a browser (guarded by typeof window check so unit tests can
 * import individual helpers without side-effects).
 *
 * @param {object} [deps]  - injectable dependencies for testing
 * @param {Document} [deps.document]
 * @param {Storage}  [deps.storage]
 * @param {MediaQueryList|null} [deps.mql]
 */
export function init({ document: doc = document, storage = localStorage, mql = null } = {}) {
  const initial = resolveInitialTheme(storage, mql);
  applyTheme(doc.documentElement, initial);

  const btn = doc.getElementById('theme-toggle');
  if (!btn) return;

  updateButton(btn, initial);

  btn.addEventListener('click', () => {
    const current = doc.documentElement.getAttribute('data-theme') || 'light';
    const next = toggleTheme(/** @type {'light'|'dark'} */ (current));
    applyTheme(doc.documentElement, next);
    setStoredTheme(storage, next);
    updateButton(btn, next);
  });
}

// Auto-init in browser context only.
if (typeof window !== 'undefined') {
  const mql = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  init({ document, storage: localStorage, mql });
}
