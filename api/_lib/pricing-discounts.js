// Pricing utilities — apply promo-code discounts to prices.
// Imports discount logic from the domain module; no I/O or side-effects.

import { percentFor } from './discounts.js';

/**
 * Applies a promo-code discount to a price expressed in integer cents.
 *
 * Returns the discounted price rounded to the nearest integer cent.
 * If `code` is not recognised the original `priceCents` is returned unchanged.
 *
 * @param {number} priceCents - Original price in cents (integer).
 * @param {string} code       - Promo code to apply (case-insensitive).
 * @returns {number}          - Discounted price in cents (integer).
 */
export function applyDiscount(priceCents, code) {
  const fraction = percentFor(code);
  if (fraction === null) return priceCents;
  return Math.round(priceCents * (1 - fraction));
}
