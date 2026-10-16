/**
 * theme-light.js — Light theme overrides for the ABCA travel site.
 *
 * Exports:
 *   LIGHT — a merged theme object built on THEME with light-mode overrides applied.
 *
 * Usage:
 *   const { LIGHT } = require('./theme-light');
 */

const { THEME } = require('./theme');

/**
 * Light theme override tokens.
 * Only keys that differ from the base THEME are listed here.
 */
const LIGHT_OVERRIDES = {
  // Backgrounds — bright, clean whites and very light tints
  colorBackground: '#ffffff',
  colorBackgroundAlt: '#f8f8f4',
  colorBackgroundDark: '#e8e8e0',

  // Text — high-contrast dark on light backgrounds
  colorText: '#1a1a1a',
  colorTextMuted: '#555555',
  colorTextInverse: '#ffffff',

  // Borders — subtle light borders
  colorBorder: '#e0e0da',
  colorBorderFocus: '#1a6b4a',

  // Primary — keep the same green brand colour but allow a slightly lighter shade
  colorPrimary: '#1a6b4a',
  colorPrimaryLight: '#2d9e6e',
  colorPrimaryDark: '#0f4a32',

  // Shadows — softer in light mode
  shadowSm: '0 1px 3px rgba(0, 0, 0, 0.08)',
  shadowMd: '0 4px 8px rgba(0, 0, 0, 0.10)',
  shadowLg: '0 8px 24px rgba(0, 0, 0, 0.12)',
};

/**
 * The full light theme: base THEME merged with LIGHT_OVERRIDES.
 * LIGHT_OVERRIDES values take precedence wherever keys overlap.
 */
const LIGHT = Object.assign({}, THEME, LIGHT_OVERRIDES);

module.exports = { LIGHT };
