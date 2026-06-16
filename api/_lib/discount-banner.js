// Promo-banner text module.
// No I/O, no side-effects — safe to import anywhere.

import { summarize } from './discount-summary.js';

/**
 * Returns a short marketing banner string for a promo code, or an empty
 * string when no code is supplied or the code is not recognised.
 *
 * Examples:
 *   bannerText('SAVE25')  → 'SAVE25 — 25% off'
 *   bannerText('WELCOME') → 'WELCOME — 15% off'
 *   bannerText('NOPE')    → ''
 *   bannerText('')        → ''
 *   bannerText()          → ''
 *
 * @param {string} [code] - Promo code (case-insensitive).
 * @returns {string}      - Marketing banner text, or '' for no/invalid code.
 */
export function bannerText(code) {
  if (!code) return '';
  const summary = summarize(code);
  if (summary === 'no discount') return '';
  return summary;
}
