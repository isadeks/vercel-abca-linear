/**
 * theme-dark.js — Dark theme overrides for the ABCA travel site.
 *
 * Exports:
 *   DARK  — flat object of dark-mode overrides, built on top of THEME
 */

const { THEME } = require('./theme.js');

const DARK = Object.assign({}, THEME, {
  // Color overrides for dark mode
  colorBackground: '#1c1c1c',
  colorBackgroundAlt: '#2a2a2a',
  colorBackgroundDark: '#111111',

  colorText: '#e8e8e8',
  colorTextMuted: '#aaaaaa',
  colorTextInverse: '#222222',

  colorBorder: '#3a3a3a',
  colorBorderFocus: '#2d9e6e',

  colorPrimary: '#2d9e6e',
  colorPrimaryLight: '#3dbf87',
  colorPrimaryDark: '#1a6b4a',

  colorSecondary: '#e6a44e',
  colorSecondaryLight: '#f0bc78',
  colorSecondaryDark: '#c9832a',

  // Shadow overrides for dark mode (deeper shadows)
  shadowSm: '0 1px 3px rgba(0, 0, 0, 0.40)',
  shadowMd: '0 4px 8px rgba(0, 0, 0, 0.50)',
  shadowLg: '0 8px 24px rgba(0, 0, 0, 0.60)',
});

module.exports = { DARK };
