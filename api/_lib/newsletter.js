/**
 * Newsletter validation helpers.
 *
 * Kept dependency-free so the module is easy to unit-test and re-use
 * across server and (future) client contexts.
 */

/**
 * Returns true when `email` is a syntactically valid email address.
 *
 * Rules enforced:
 *   - Must be a non-empty string (no null / undefined / other types).
 *   - Must contain exactly one `@` with a non-empty local part before it.
 *   - Domain must be non-empty and contain at least one dot.
 *   - No whitespace characters anywhere in the address.
 *
 * @param {unknown} email
 * @returns {boolean}
 */
export function validateEmail(email) {
  if (typeof email !== 'string' || email.trim() === '') {
    return false;
  }
  // /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  //   [^\s@]+   – local part: one or more chars that are not whitespace or @
  //   @         – literal @
  //   [^\s@]+   – domain label(s)
  //   \.        – at least one dot in the domain
  //   [^\s@]+   – TLD / remaining domain part
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
