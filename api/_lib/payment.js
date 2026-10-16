/**
 * payment.js — Payment gateway domain module for Wander bookings.
 *
 * Pure functions + a deterministic mock gateway. No real I/O, no external deps.
 * Imported by api/pay.js (POST /api/pay).
 *
 * Dependency position in the booking engine:
 *   booking.js → payment.js   (payment is the final step after createBooking)
 *
 * Gateway behaviour (mock):
 *   - Luhn-invalid cards         → validation error (card.number failed Luhn check)
 *   - Card 4000000000000002      → declined (gateway decline, ok: false, declined: true)
 *   - All other Luhn-valid cards → captured (ok: true)
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Known gateway-decline card numbers (Luhn-valid but always declined).
 * Mirrors Stripe's test-card convention so teams can copy-paste familiar values.
 */
const GATEWAY_DECLINE_CARDS = new Set(['4000000000000002']);

/** Expiry regex: MM/YY */
const EXPIRY_RE = /^(0[1-9]|1[0-2])\/(\d{2})$/;

/** CVV regex: 3 or 4 digits */
const CVV_RE = /^\d{3,4}$/;

/** Card number regex: 13–19 digits, optional spaces */
const CARD_RE = /^[\d ]{13,23}$/;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Strip all whitespace from a string.
 * @param {string} s
 * @returns {string}
 */
function stripSpaces(s) {
  return s.replace(/\s/g, '');
}

/**
 * Luhn algorithm — returns true iff the digits string passes the check.
 * @param {string} digits  Card number with no spaces.
 * @returns {boolean}
 */
function passesLuhn(digits) {
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

/**
 * Return true iff the MM/YY expiry is in the current month or a future month.
 * @param {string} expiry  MM/YY
 * @returns {boolean}
 */
function isExpiryFuture(expiry) {
  const m = EXPIRY_RE.exec(expiry);
  if (!m) return false;
  const month = parseInt(m[1], 10);
  const year = 2000 + parseInt(m[2], 10);
  const now = new Date();
  const cy = now.getUTCFullYear();
  const cm = now.getUTCMonth() + 1; // 1–12
  return year > cy || (year === cy && month >= cm);
}

/**
 * Derive a deterministic transaction ID from the payment request fields.
 * @param {string} confirmationId
 * @param {number} amountUsd
 * @returns {string}
 */
function deriveTransactionId(confirmationId, amountUsd) {
  return `txn-${confirmationId}-${Math.round(amountUsd * 100)}`;
}

// ---------------------------------------------------------------------------
// Exported functions
// ---------------------------------------------------------------------------

/**
 * Process a payment for a confirmed Wander booking.
 *
 * All failing validation rules are accumulated — this function does NOT
 * short-circuit on the first error (matching the convention in validation.js).
 *
 * @param {{
 *   confirmationId: string,
 *   amountUsd:      number,
 *   card: {
 *     number:     string,
 *     expiry:     string,
 *     cvv:        string,
 *     holderName: string,
 *   }
 * }} request
 * @param {string} [txnId]  Optional override for transactionId (useful in tests).
 *
 * @returns {{ ok: false, errors: string[] }
 *          | { ok: false, errors: string[], declined: true }
 *          | { ok: true, transactionId: string, confirmationId: string, amountUsd: number, status: 'captured' }}
 */
export function processPayment(request, txnId) {
  const { confirmationId, amountUsd, card } = request;
  const errors = [];

  // Rule 1: confirmationId must be a non-empty string
  if (typeof confirmationId !== 'string' || confirmationId.trim() === '') {
    errors.push('confirmationId must be a non-empty string');
  }

  // Rule 2: amountUsd must be a finite positive number
  if (typeof amountUsd !== 'number' || !isFinite(amountUsd) || amountUsd <= 0) {
    errors.push('amountUsd must be a positive number');
  }

  // Rule 3+: card must be an object before we inspect its fields
  if (card === null || typeof card !== 'object') {
    errors.push('card must be an object with number, expiry, cvv, and holderName');
    return { ok: false, errors };
  }

  const { number: cardNumber, expiry, cvv, holderName } = card;

  // Rule 3: card.number — 13–19 digits (spaces allowed), must pass Luhn check
  if (typeof cardNumber !== 'string' || !CARD_RE.test(cardNumber)) {
    errors.push('card.number must be 13–19 digits');
  } else {
    const digits = stripSpaces(cardNumber);
    if (!/^\d+$/.test(digits)) {
      errors.push('card.number must contain digits only (spaces permitted)');
    } else if (!passesLuhn(digits)) {
      errors.push('card.number failed Luhn check');
    }
  }

  // Rule 4: card.expiry — MM/YY format, must be current or future month
  if (typeof expiry !== 'string' || !EXPIRY_RE.test(expiry)) {
    errors.push('card.expiry must be in MM/YY format');
  } else if (!isExpiryFuture(expiry)) {
    errors.push('card.expiry is in the past');
  }

  // Rule 5: card.cvv — 3 or 4 digits
  if (typeof cvv !== 'string' || !CVV_RE.test(cvv)) {
    errors.push('card.cvv must be 3 or 4 digits');
  }

  // Rule 6: card.holderName — non-empty string
  if (typeof holderName !== 'string' || holderName.trim() === '') {
    errors.push('card.holderName must be a non-empty string');
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  // Mock gateway decision — check known decline cards
  const digits = stripSpaces(cardNumber);
  if (GATEWAY_DECLINE_CARDS.has(digits)) {
    return { ok: false, errors: ['card declined by gateway'], declined: true };
  }

  const transactionId = txnId ?? deriveTransactionId(confirmationId, amountUsd);

  return {
    ok: true,
    transactionId,
    confirmationId,
    amountUsd,
    status: 'captured',
  };
}
