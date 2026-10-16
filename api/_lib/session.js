/**
 * session.js — JWT-based session utilities for the Wander auth layer.
 *
 * Uses Node's built-in `crypto` module (HMAC-SHA256) — no extra dependencies.
 * The secret is read from process.env.SESSION_SECRET; a hard-coded fallback
 * is provided for local dev / tests only (never ship without the env var set).
 */

import { createHmac, timingSafeEqual } from 'crypto';

export const SESSION_COOKIE_NAME = 'wander_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24; // 24 h

function getSecret() {
  return process.env.SESSION_SECRET ?? 'dev-secret-change-in-production';
}

// ── Base64url helpers ──────────────────────────────────────────────────────

function b64urlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function b64urlDecode(str) {
  // Pad to multiple of 4
  const padded = str + '='.repeat((4 - (str.length % 4)) % 4);
  return Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

// ── HS256 JWT ──────────────────────────────────────────────────────────────

const HEADER = b64urlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));

function sign(data) {
  return createHmac('sha256', getSecret()).update(data).digest('base64url');
}

/**
 * Create a signed JWT containing the given payload.
 * @param {object} payload
 * @returns {string}
 */
export function createToken(payload) {
  const body = b64urlEncode(JSON.stringify(payload));
  const sig = sign(`${HEADER}.${body}`);
  return `${HEADER}.${body}.${sig}`;
}

/**
 * Verify and decode a JWT.  Returns the payload on success, null on failure.
 * @param {string} token
 * @returns {object|null}
 */
export function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, body, sig] = parts;

  // Constant-time signature check
  const expected = sign(`${header}.${body}`);
  try {
    const a = Buffer.from(sig, 'base64url');
    const b = Buffer.from(expected, 'base64url');
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  let payload;
  try {
    payload = JSON.parse(b64urlDecode(body));
  } catch {
    return null;
  }

  // Expiry check
  if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null;

  return payload;
}

// ── Cookie helpers ─────────────────────────────────────────────────────────

/**
 * Build a Set-Cookie header value for a new session.
 * @param {{ email: string }} sessionData
 * @returns {string}
 */
export function serializeSessionCookie(sessionData) {
  const now = Math.floor(Date.now() / 1000);
  const token = createToken({
    sub: sessionData.email,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  });
  return [
    `${SESSION_COOKIE_NAME}=${token}`,
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${SESSION_TTL_SECONDS}`,
    'Path=/',
  ].join('; ');
}

/**
 * Build a Set-Cookie header value that clears the session cookie.
 * @returns {string}
 */
export function clearSessionCookie() {
  return `${SESSION_COOKIE_NAME}=; HttpOnly; SameSite=Strict; Max-Age=0; Path=/`;
}

// ── Request helper ─────────────────────────────────────────────────────────

/**
 * Parse the Cookie header and return the session payload, or null if absent/invalid.
 * @param {{ headers: { cookie?: string } }} req  Vercel/Node IncomingMessage
 * @returns {object|null}
 */
export function getSession(req) {
  const cookieHeader = req.headers?.cookie ?? '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map((c) => {
      const idx = c.indexOf('=');
      if (idx === -1) return [c.trim(), ''];
      return [c.slice(0, idx).trim(), c.slice(idx + 1).trim()];
    }),
  );
  return verifyToken(cookies[SESSION_COOKIE_NAME] ?? '');
}
