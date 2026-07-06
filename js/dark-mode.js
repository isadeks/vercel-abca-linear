/**
 * dark-mode.js — ESM module for dark mode persistence via localStorage.
 *
 * Public API:
 *   init()    — call once on page load; reads stored preference or falls back
 *               to prefers-color-scheme; applies data-theme="dark" when dark.
 *   toggle()  — flip the current theme and persist the choice to localStorage.
 *   getTheme()— returns the current theme string ('dark' | 'light').
 */

const STORAGE_KEY = 'theme';
const DARK = 'dark';
const LIGHT = 'light';
const ATTR = 'data-theme';

/**
 * Resolve the initial theme:
 *  1. Stored preference in localStorage takes priority.
 *  2. OS-level prefers-color-scheme is the fallback.
 *  3. Default to light when neither is available.
 *
 * @returns {'dark'|'light'}
 */
function resolveInitialTheme() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === DARK || stored === LIGHT) {
    return stored;
  }
  if (
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ) {
    return DARK;
  }
  return LIGHT;
}

/**
 * Apply a theme to the root element and persist it to localStorage.
 *
 * @param {'dark'|'light'} theme
 */
function applyTheme(theme) {
  if (theme === DARK) {
    document.documentElement.setAttribute(ATTR, DARK);
  } else {
    document.documentElement.removeAttribute(ATTR);
  }
  localStorage.setItem(STORAGE_KEY, theme);
}

/**
 * Initialise dark mode on page load.
 * Reads the stored preference (or falls back to prefers-color-scheme) and
 * applies the resolved theme to document.documentElement.
 */
export function init() {
  const theme = resolveInitialTheme();
  applyTheme(theme);
}

/**
 * Toggle the current theme and persist the new value to localStorage.
 */
export function toggle() {
  const current = document.documentElement.getAttribute(ATTR);
  const next = current === DARK ? LIGHT : DARK;
  applyTheme(next);
}

/**
 * Return the current theme based on the data-theme attribute.
 *
 * @returns {'dark'|'light'}
 */
export function getTheme() {
  return document.documentElement.getAttribute(ATTR) === DARK ? DARK : LIGHT;
}
