// Human-readable discount summary module.
// No I/O, no side-effects — safe to import anywhere.

import { percentFor } from './discounts.js';

/**
 * Returns a short human-readable description of the discount for a promo code.
 *
 * Examples:
 *   summarize('SAVE25')  → 'SAVE25 — 25% off'
 *   summarize('WELCOME') → 'WELCOME — 15% off'
 *   summarize('NOPE')    → 'no discount'
 *
 * @param {string} code - Promo code (case-insensitive).
 * @returns {string}    - Human-readable discount string.
 */
export function summarize(code) {
  const fraction = percentFor(code);
  if (fraction === null) return 'no discount';
  const pct = Math.round(fraction * 100);
  return `${code.toUpperCase()} — ${pct}% off`;
}
