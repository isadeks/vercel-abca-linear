/**
 * auth.js — Authentication logic: register, login, JWT sign / verify.
 *
 * JWT implementation uses the `jose` library (Web Crypto compatible).
 * Algorithm: HS256 (symmetric HMAC-SHA256) — adequate for a mono-service API.
 *
 * The JWT secret is taken from the JWT_SECRET environment variable.
 * A hard-coded fallback is used so tests work without setting env vars;
 * production deployments MUST set JWT_SECRET to a strong random value.
 *
 * Token payload:
 *   { sub: userId, email, role, iat, exp }
 */

import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { findByEmail, createUser } from './users.js';

const BCRYPT_ROUNDS = 10;
const TOKEN_TTL = '24h';
const FALLBACK_SECRET = 'wander-dev-secret-do-not-use-in-production';

/**
 * Encode the JWT secret as a Uint8Array (required by jose).
 */
function _secret() {
  const raw = (typeof process !== 'undefined' && process.env?.JWT_SECRET) || FALLBACK_SECRET;
  return new TextEncoder().encode(raw);
}

/**
 * Sign a JWT for the given user payload.
 * @param {{ id: string, email: string, role: string }} user
 * @returns {Promise<string>} signed JWT string
 */
export async function signToken(user) {
  return new SignJWT({ email: user.email, role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(_secret());
}

/**
 * Verify a JWT and return the decoded payload.
 * Throws if the token is invalid or expired.
 * @param {string} token
 * @returns {Promise<import('jose').JWTPayload & { email: string, role: string }>}
 */
export async function verifyToken(token) {
  const { payload } = await jwtVerify(token, _secret(), { algorithms: ['HS256'] });
  return payload;
}

/**
 * Register a new user account.
 *
 * @param {{ email: string, password: string, role?: 'admin'|'user' }} params
 * @returns {Promise<{ user: { id: string, email: string, role: string }, token: string }>}
 * @throws {Error} if email is already taken or inputs are invalid
 */
export async function register({ email, password, role = 'user' }) {
  if (!email || typeof email !== 'string') throw new Error('email is required');
  if (!password || typeof password !== 'string' || password.length < 8) {
    throw new Error('password must be at least 8 characters');
  }
  if (role !== 'admin' && role !== 'user') throw new Error('role must be admin or user');

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = createUser({ email, passwordHash, role });
  const token = await signToken(user);
  return { user, token };
}

/**
 * Authenticate an existing user.
 *
 * @param {{ email: string, password: string }} params
 * @returns {Promise<{ user: { id: string, email: string, role: string }, token: string }>}
 * @throws {Error} if credentials are invalid
 */
export async function login({ email, password }) {
  if (!email || !password) throw new Error('email and password are required');

  const existing = findByEmail(email);
  if (!existing) throw new Error('Invalid credentials');

  const match = await bcrypt.compare(password, existing.passwordHash);
  if (!match) throw new Error('Invalid credentials');

  const user = { id: existing.id, email: existing.email, role: existing.role };
  const token = await signToken(user);
  return { user, token };
}
