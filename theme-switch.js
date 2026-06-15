/**
 * theme-switch.js — Theme switcher for the ABCA travel site.
 *
 * This is the diamond merge point: it depends on BOTH theme-light.js and
 * theme-dark.js, each of which in turn depends on theme.js.
 *
 * Exports:
 *   applyTheme(mode) — applies the selected theme's tokens to
 *                      document.documentElement as CSS custom properties.
 *
 * @param {'light'|'dark'} mode — Which theme to activate.
 *
 * Usage:
 *   const { applyTheme } = require('./theme-switch');
 *   applyTheme('dark');   // switches to dark mode
 *   applyTheme('light');  // switches to light mode
 */

const { LIGHT } = require('./theme-light');
const { DARK } = require('./theme-dark');

/**
 * Converts a camelCase token name to a CSS custom property name.
 * e.g. "colorPrimary" → "--color-primary"
 *
 * @param {string} name — camelCase token name
 * @returns {string} CSS custom property name (kebab-case with leading --)
 */
function tokenToCssVar(name) {
  return '--' + name.replace(/([A-Z])/g, (match) => '-' + match.toLowerCase());
}

/**
 * Applies all tokens from the given theme object to document.documentElement
 * as CSS custom properties.
 *
 * @param {Object} theme — flat object of design tokens
 */
function applyTokens(theme) {
  const root = document.documentElement;
  Object.entries(theme).forEach(([key, value]) => {
    root.style.setProperty(tokenToCssVar(key), value);
  });
}

/**
 * Selects the LIGHT or DARK theme based on `mode` and applies its tokens
 * to document.documentElement.
 *
 * @param {'light'|'dark'} mode — 'light' for the light theme, 'dark' for dark.
 * @throws {Error} if an unrecognised mode is provided.
 */
function applyTheme(mode) {
  switch (mode) {
    case 'light':
      applyTokens(LIGHT);
      break;
    case 'dark':
      applyTokens(DARK);
      break;
    default:
      throw new Error(
        'applyTheme: unknown mode "' + mode + '". Expected "light" or "dark".'
      );
  }
}

module.exports = { applyTheme, LIGHT, DARK };
