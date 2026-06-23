/**
 * auth.js — user authentication module
 *
 * Provides password hashing, token generation/verification, and
 * register/login helpers. Stateless: the caller owns the user store
 * (Map or plain object keyed by email). No external dependencies —
 * uses only Node.js built-in `crypto`.
 *
 * Token format: base64url(header).base64url(payload).base64url(signature)
 * where signature = HMAC-SHA256(header.payload, secret).
 */

import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

// ── Internals ──────────────────────────────────────────────────────────────

const HASH_ALGORITHM = 'sha256';
const TOKEN_ALGORITHM = 'sha256';
const DEFAULT_TOKEN_TTL_SECONDS = 3600; // 1 hour

/**
 * Encode a buffer or string to base64url (URL-safe, no padding).
 * @param {Buffer|string} data
 * @returns {string}
 */
function toBase64url(data) {
  const b64 = Buffer.from(data).toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Decode a base64url string to a Buffer.
 * @param {string} str
 * @returns {Buffer}
 */
function fromBase64url(str) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4;
  const b64 = pad ? padded + '='.repeat(4 - pad) : padded;
  return Buffer.from(b64, 'base64');
}

// ── Password hashing ───────────────────────────────────────────────────────

/**
 * Hash a plain-text password with a random salt.
 * Returns a string in the form  `salt:hash`  (both hex-encoded).
 *
 * @param {string} plaintext
 * @returns {string}  storable hash string
 */
export function hashPassword(plaintext) {
  if (typeof plaintext !== 'string' || plaintext.length === 0) {
    throw new TypeError('password must be a non-empty string');
  }
  const salt = randomBytes(16).toString('hex');
  const hash = createHmac(HASH_ALGORITHM, salt).update(plaintext).digest('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify a plain-text password against a stored hash string.
 * Uses a timing-safe comparison to mitigate timing attacks.
 *
 * @param {string} plaintext   candidate password
 * @param {string} stored      value returned by hashPassword()
 * @returns {boolean}
 */
export function verifyPassword(plaintext, stored) {
  if (typeof plaintext !== 'string' || typeof stored !== 'string') return false;
  const colonIdx = stored.indexOf(':');
  if (colonIdx === -1) return false;
  const salt = stored.slice(0, colonIdx);
  const expectedHash = stored.slice(colonIdx + 1);
  const candidateHash = createHmac(HASH_ALGORITHM, salt).update(plaintext).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(candidateHash, 'hex'), Buffer.from(expectedHash, 'hex'));
  } catch {
    return false;
  }
}

// ── Token (mini-JWT) ───────────────────────────────────────────────────────

/**
 * Create a signed token for a given payload.
 *
 * @param {object} payload          arbitrary serialisable data (e.g. { userId, email })
 * @param {string} secret           HMAC signing secret
 * @param {number} [ttlSeconds]     token lifetime in seconds (default: 3600)
 * @returns {string}                dot-separated base64url token
 */
export function createToken(payload, secret, ttlSeconds = DEFAULT_TOKEN_TTL_SECONDS) {
  if (typeof secret !== 'string' || secret.length === 0) {
    throw new TypeError('secret must be a non-empty string');
  }
  const header = toBase64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = toBase64url(JSON.stringify({
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  }));
  const sig = toBase64url(
    createHmac(TOKEN_ALGORITHM, secret).update(`${header}.${body}`).digest(),
  );
  return `${header}.${body}.${sig}`;
}

/**
 * Verify a token and return its payload, or null if invalid / expired.
 *
 * @param {string} token
 * @param {string} secret
 * @returns {object|null}  decoded payload, or null on failure
 */
export function verifyToken(token, secret) {
  if (typeof token !== 'string' || typeof secret !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  // Re-compute expected signature
  const expectedSig = toBase64url(
    createHmac(TOKEN_ALGORITHM, secret).update(`${header}.${body}`).digest(),
  );
  const sigBuf = fromBase64url(sig);
  const expectedSigBuf = fromBase64url(expectedSig);
  // Timing-safe comparison (pads to same length to avoid length leak)
  if (sigBuf.length !== expectedSigBuf.length) return null;
  try {
    if (!timingSafeEqual(sigBuf, expectedSigBuf)) return null;
  } catch {
    return null;
  }
  // Decode payload
  let payload;
  try {
    payload = JSON.parse(fromBase64url(body).toString('utf8'));
  } catch {
    return null;
  }
  // Check expiry
  if (typeof payload.exp === 'number' && Math.floor(Date.now() / 1000) > payload.exp) {
    return null;
  }
  return payload;
}

// ── User store helpers ─────────────────────────────────────────────────────

/**
 * Register a new user in the provided store.
 * The store is a Map<email, { id, email, passwordHash }>.
 *
 * @param {Map<string, object>} users   mutable user store
 * @param {string}              email
 * @param {string}              password  plain-text; will be hashed
 * @returns {{ ok: boolean, user?: object, error?: string }}
 */
export function register(users, email, password) {
  if (!(users instanceof Map)) return { ok: false, error: 'invalid user store' };
  if (typeof email !== 'string' || !email.includes('@')) {
    return { ok: false, error: 'invalid email address' };
  }
  if (typeof password !== 'string' || password.length < 8) {
    return { ok: false, error: 'password must be at least 8 characters' };
  }
  const normalised = email.trim().toLowerCase();
  if (users.has(normalised)) {
    return { ok: false, error: 'email already registered' };
  }
  const user = {
    id: randomBytes(8).toString('hex'),
    email: normalised,
    passwordHash: hashPassword(password),
  };
  users.set(normalised, user);
  const safeUser = { id: user.id, email: user.email };
  return { ok: true, user: safeUser };
}

/**
 * Authenticate a user and, on success, return a signed token.
 *
 * @param {Map<string, object>} users   user store populated by register()
 * @param {string}              email
 * @param {string}              password  plain-text candidate password
 * @param {string}              secret    token signing secret
 * @param {number}              [ttlSeconds]
 * @returns {{ ok: boolean, token?: string, user?: object, error?: string }}
 */
export function login(users, email, password, secret, ttlSeconds = DEFAULT_TOKEN_TTL_SECONDS) {
  if (!(users instanceof Map)) return { ok: false, error: 'invalid user store' };
  if (typeof email !== 'string' || typeof password !== 'string') {
    return { ok: false, error: 'email and password are required' };
  }
  const normalised = email.trim().toLowerCase();
  const user = users.get(normalised);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { ok: false, error: 'invalid email or password' };
  }
  const token = createToken({ userId: user.id, email: user.email }, secret, ttlSeconds);
  const safeUser = { id: user.id, email: user.email };
  return { ok: true, token, user: safeUser };
}
