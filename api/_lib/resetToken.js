/**
 * Password-reset token lifecycle.
 *
 * Tokens are:
 *  - Cryptographically random (32 bytes → 64-char hex string).
 *  - Time-limited (default 1 hour).
 *  - Single-use: consumed on first successful validation.
 *  - Scoped to an email address so they can't be transplanted to another account.
 *
 * The in-memory store is intentionally simple — swap _tokens for a DB table in
 * production. The exported interface stays stable.
 */

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * @type {Map<string, { email: string, expiresAt: number }>}
 * Key: token hex string
 */
const _tokens = new Map();

/**
 * Generate and store a new reset token for the given email.
 * Any previous unexpired token for the same email is replaced
 * (one active token per user at a time).
 *
 * @param {string} email
 * @returns {{ token: string, expiresAt: number }}
 */
export function createResetToken(email) {
  if (!email || typeof email !== 'string') {
    throw new Error('email is required');
  }
  const normalizedEmail = email.toLowerCase().trim();

  // Evict any existing token for this email to enforce one-at-a-time.
  for (const [tok, entry] of _tokens.entries()) {
    if (entry.email === normalizedEmail) {
      _tokens.delete(tok);
    }
  }

  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const token = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  const expiresAt = Date.now() + RESET_TOKEN_TTL_MS;

  _tokens.set(token, { email: normalizedEmail, expiresAt });
  return { token, expiresAt };
}

/**
 * Validate a reset token.
 * Returns the email the token was issued for, or throws on any failure.
 * Does NOT consume the token — call consumeResetToken after the password update
 * so you don't lose the token if the DB write fails.
 *
 * @param {string} token
 * @param {string} email  The claimed email — must match the token record.
 * @returns {string} normalized email
 * @throws on invalid, expired, or mismatched tokens
 */
export function validateResetToken(token, email) {
  if (!token || !email) throw new Error('token and email are required');
  const entry = _tokens.get(token);
  if (!entry) throw new Error('Reset token not found or already used');
  if (Date.now() > entry.expiresAt) {
    _tokens.delete(token);
    throw new Error('Reset token has expired');
  }
  if (entry.email !== email.toLowerCase().trim()) {
    throw new Error('Reset token does not match this email address');
  }
  return entry.email;
}

/**
 * Consume (invalidate) a reset token after a successful password change.
 * @param {string} token
 */
export function consumeResetToken(token) {
  _tokens.delete(token);
}

/**
 * Clear all tokens — for test isolation only.
 */
export function _resetTokenStore() {
  _tokens.clear();
}
