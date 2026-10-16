/**
 * authMiddleware.js — Token validation guard for Vercel serverless functions.
 *
 * Usage in a serverless handler:
 *
 *   import { requireAuth } from '../_lib/authMiddleware.js';
 *
 *   export default async function handler(req, res) {
 *     const authResult = await requireAuth(req, res);
 *     if (!authResult) return; // response already sent (401/403)
 *     const { user } = authResult;
 *     // user = { id, email, role }
 *   }
 *
 * The token is expected in the Authorization header as:
 *   Authorization: Bearer <jwt>
 */

import { verifyToken } from './auth.js';

/**
 * Extract the Bearer token from the Authorization header.
 * @param {object} req  - Node/Vercel request object
 * @returns {string|null}
 */
function extractBearerToken(req) {
  const header = req.headers?.authorization || req.headers?.Authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  return header.slice(7).trim() || null;
}

/**
 * Validate the JWT and attach the authenticated user to `req.user`.
 * Returns the decoded user object on success, or sends a 401/403 and returns
 * null on failure (the caller must check for null and return immediately).
 *
 * @param {object} req  - request object (mutated: req.user is set on success)
 * @param {object} res  - response object (used to send error responses)
 * @param {{ roles?: Array<'admin'|'user'> }} [options]
 *   - roles: if provided, the user's role must be in this list (403 if not)
 * @returns {Promise<{ user: { id: string, email: string, role: string } } | null>}
 */
export async function requireAuth(req, res, options = {}) {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Unauthorized: missing or invalid Authorization header' });
    return null;
  }

  let payload;
  try {
    payload = await verifyToken(token);
  } catch {
    res.status(401).json({ error: 'Unauthorized: invalid or expired token' });
    return null;
  }

  const user = {
    id: payload.sub,
    email: payload.email,
    role: payload.role,
  };

  if (options.roles && !options.roles.includes(user.role)) {
    res.status(403).json({ error: 'Forbidden: insufficient permissions' });
    return null;
  }

  req.user = user;
  return { user };
}

/**
 * Convenience wrapper that requires the user to have the 'admin' role.
 * @param {object} req
 * @param {object} res
 * @returns {Promise<{ user: object } | null>}
 */
export async function requireAdmin(req, res) {
  return requireAuth(req, res, { roles: ['admin'] });
}

/**
 * Convenience wrapper that requires the caller to be authenticated as any
 * valid user (role 'user' OR 'admin'). Unauthenticated requests get 401;
 * authenticated requests with an unrecognised role get 403.
 *
 * @param {object} req
 * @param {object} res
 * @returns {Promise<{ user: object } | null>}
 */
export async function requireUser(req, res) {
  return requireAuth(req, res, { roles: ['user', 'admin'] });
}
