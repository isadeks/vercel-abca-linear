/**
 * theme.js — Design tokens for the ABCA travel site.
 *
 * Exports:
 *   THEME       — flat object of color + spacing tokens
 *   getToken(name) — helper that returns a token value by name
 */

const THEME = {
  // Color tokens
  colorPrimary: '#1a6b4a',
  colorPrimaryLight: '#2d9e6e',
  colorPrimaryDark: '#0f4a32',

  colorSecondary: '#c9832a',
  colorSecondaryLight: '#e6a44e',
  colorSecondaryDark: '#8a5a1c',

  colorBackground: '#ffffff',
  colorBackgroundAlt: '#f5f5f0',
  colorBackgroundDark: '#1c1c1c',

  colorText: '#222222',
  colorTextMuted: '#666666',
  colorTextInverse: '#ffffff',

  colorBorder: '#dddddd',
  colorBorderFocus: '#1a6b4a',

  colorSuccess: '#2e7d32',
  colorWarning: '#f57c00',
  colorError: '#c62828',
  colorInfo: '#0277bd',

  // Spacing tokens (in px)
  spacingXxs: '4px',
  spacingXs: '8px',
  spacingSm: '12px',
  spacingMd: '16px',
  spacingLg: '24px',
  spacingXl: '32px',
  spacingXxl: '48px',
  spacing3xl: '64px',
  spacing4xl: '96px',

  // Typography tokens
  fontFamilyBase: "'Segoe UI', Arial, sans-serif",
  fontFamilyHeading: "Georgia, 'Times New Roman', serif",
  fontFamilyMono: "'Courier New', Courier, monospace",

  fontSizeXs: '12px',
  fontSizeSm: '14px',
  fontSizeMd: '16px',
  fontSizeLg: '18px',
  fontSizeXl: '20px',
  fontSize2xl: '24px',
  fontSize3xl: '32px',
  fontSize4xl: '40px',

  fontWeightRegular: '400',
  fontWeightMedium: '500',
  fontWeightBold: '700',

  lineHeightTight: '1.2',
  lineHeightBase: '1.5',
  lineHeightRelaxed: '1.75',

  // Border radius tokens
  radiusSm: '4px',
  radiusMd: '8px',
  radiusLg: '12px',
  radiusFull: '9999px',

  // Shadow tokens
  shadowSm: '0 1px 3px rgba(0, 0, 0, 0.12)',
  shadowMd: '0 4px 8px rgba(0, 0, 0, 0.16)',
  shadowLg: '0 8px 24px rgba(0, 0, 0, 0.20)',

  // Breakpoints
  breakpointSm: '576px',
  breakpointMd: '768px',
  breakpointLg: '992px',
  breakpointXl: '1200px',

  // Z-index tokens
  zIndexDropdown: '1000',
  zIndexModal: '1050',
  zIndexTooltip: '1100',
};

/**
 * Returns the value of a theme token by name.
 * @param {string} name — The token name (e.g. 'colorPrimary')
 * @returns {string|undefined} The token value, or undefined if not found
 */
function getToken(name) {
  return THEME[name];
}

module.exports = { THEME, getToken };
