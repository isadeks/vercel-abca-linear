/**
 * Auth middleware utilities for Vercel serverless handlers.
 *
 * Usage in a handler:
 *   import { requireAuth } from '../_lib/middleware.js';
 *   export default async function handler(req, res) {
 *     const user = await requireAuth(req, res);
 *     if (!user) return;   // requireAuth already sent 401
 *     // ...proceed with authenticated logic
 *   }
 */
import { verifyAccessToken } from './session.js';

/**
 * Extract the Bearer token from the Authorization header.
 * @param {import('http').IncomingMessage} req
 * @returns {string|null}
 */
function extractBearerToken(req) {
  const authHeader = req.headers?.authorization ?? req.headers?.Authorization ?? '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

/**
 * Validate the incoming request's access token.
 *
 * On success returns the decoded payload `{ sub, email, iat, exp }`.
 * On failure writes a 401 JSON response and returns null — the caller must
 * return immediately without writing further to `res`.
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {Promise<{ sub: string, email: string, iat: number, exp: number } | null>}
 */
export async function requireAuth(req, res) {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Missing authorization token' });
    return null;
  }
  try {
    const payload = await verifyAccessToken(token);
    return payload;
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
    return null;
  }
}

/**
 * Lightweight CORS preflight helper — call at the top of every handler that
 * should accept cross-origin credentials.
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @param {{ allowedOrigins?: string[] }} [opts]
 * @returns {boolean}  true if the response was already sent (preflight), false otherwise
 */
export function handleCors(req, res, { allowedOrigins = [] } = {}) {
  const origin = req.headers?.origin ?? '';
  const allowed = allowedOrigins.length === 0 || allowedOrigins.includes(origin);
  if (allowed && origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}
