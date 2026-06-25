/**
 * Auth middleware utilities for Vercel serverless handlers.
 *
 * Usage in a handler:
 *   import { requireAuth, withRole } from '../_lib/middleware.js';
 *
 *   // Pattern A — manual check:
 *   export default async function handler(req, res) {
 *     const user = await requireAuth(req, res);
 *     if (!user) return;   // requireAuth already sent 401
 *     // ...proceed with authenticated logic
 *   }
 *
 *   // Pattern B — role guard wrapper:
 *   export default withRole('admin', async (req, res, payload) => {
 *     // payload guaranteed; role already validated
 *   });
 */
import { verifyAccessToken } from './session.js';
import { ROLES } from './user.js';

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
 * On success returns the decoded payload `{ sub, email, role?, iat, exp }`.
 * On failure writes a 401 JSON response and returns null — the caller must
 * return immediately without writing further to `res`.
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {Promise<{ sub: string, email: string, role?: string, iat: number, exp: number } | null>}
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
 * Higher-order handler wrapper that enforces authentication AND a minimum role.
 *
 * Roles are ordered: viewer < editor < admin.  Passing `requiredRole = 'editor'`
 * means both 'editor' and 'admin' are accepted; 'viewer' is rejected.
 *
 * Usage:
 *   export default withRole('admin', async (req, res, payload) => { ... });
 *
 * On missing/invalid token  → 401 { error: 'Missing authorization token' }
 * On insufficient role      → 403 { error: 'Insufficient permissions' }
 *
 * @param {string} requiredRole  Minimum role required (e.g. 'viewer', 'editor', 'admin')
 * @param {(req: import('http').IncomingMessage, res: import('http').ServerResponse, payload: object) => Promise<void>} handler
 * @returns {(req: import('http').IncomingMessage, res: import('http').ServerResponse) => Promise<void>}
 */
export function withRole(requiredRole, handler) {
  if (!ROLES.includes(requiredRole)) {
    throw new Error(`withRole: unknown role "${requiredRole}". Must be one of: ${ROLES.join(', ')}`);
  }
  const minIndex = ROLES.indexOf(requiredRole);

  return async function roleGuard(req, res) {
    const payload = await requireAuth(req, res);
    if (!payload) return; // 401 already sent

    const userRole = payload.role ?? 'viewer'; // default to least-privilege
    const userIndex = ROLES.indexOf(userRole);

    if (userIndex < minIndex) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    return handler(req, res, payload);
  };
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
