// Role-based access control (RBAC) middleware factory.
//
// Usage (Vercel serverless handler):
//
//   import { requireRole } from '../_lib/rbac.js';
//   import { ROLES } from '../_lib/roles.js';
//
//   export default requireRole(ROLES.EDITOR, async (req, res) => {
//     res.status(200).json({ message: 'Hello, editor!' });
//   });
//
// How it works:
//   1. Reads the `session` HttpOnly cookie from the request.
//   2. Validates the JWT access token and extracts `sub` (userId).
//   3. Looks up the user record to get their stored role.
//   4. Compares the user's role against the required role using the
//      ROLES hierarchy from roles.js (viewer < editor < admin).
//   5. Returns 401 for missing / invalid tokens, 403 for insufficient role.
//   6. Injects `req.user = { userId, role }` for use in the handler.
//
// Required env var: JWT_SECRET

import { parseCookies } from './oauth.js';
import { validateAccessToken } from './session.js';
import { hasRequiredRole } from './roles.js';

let _userAdapter = null;

/**
 * Register a user adapter that exposes `findUserById`.
 * Must be called at application startup (or in tests) before any RBAC-guarded
 * route is exercised.
 *
 * @param {{ findUserById: (id: string) => Promise<object|null> }} adapter
 */
export function setRbacUserAdapter(adapter) {
  _userAdapter = adapter;
}

/** @returns {{ findUserById: Function }} */
function rbacUserAdapter() {
  if (!_userAdapter) {
    throw new Error(
      'No RBAC user adapter configured. Call setRbacUserAdapter() before using requireRole().',
    );
  }
  return _userAdapter;
}

/**
 * Higher-order function that wraps a Vercel serverless handler with role
 * enforcement.
 *
 * @param {string}   requiredRole  Minimum role required (use ROLES constants).
 * @param {Function} handler       The inner handler `(req, res) => Promise<void>`.
 * @returns {Function}             A new handler that enforces the role.
 */
export function requireRole(requiredRole, handler) {
  return async function rbacHandler(req, res) {
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      res.status(500).json({ error: 'Server misconfiguration: JWT_SECRET not set.' });
      return;
    }

    // ── 1. Extract token from cookie ──────────────────────────────────────
    const cookies     = parseCookies(req.headers?.cookie);
    const accessToken = cookies.session;

    if (!accessToken) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    // ── 2. Validate JWT ───────────────────────────────────────────────────
    let payload;
    try {
      payload = validateAccessToken(accessToken, jwtSecret);
    } catch {
      res.status(401).json({ error: 'Invalid or expired session.' });
      return;
    }

    const userId = payload.sub;

    // ── 3. Load user record ───────────────────────────────────────────────
    let user;
    try {
      user = await rbacUserAdapter().findUserById(userId);
    } catch {
      res.status(500).json({ error: 'Failed to load user record.' });
      return;
    }

    if (!user) {
      res.status(401).json({ error: 'User not found.' });
      return;
    }

    // ── 4. Check role ─────────────────────────────────────────────────────
    if (!hasRequiredRole(user.role, requiredRole)) {
      res.status(403).json({ error: 'Insufficient permissions.' });
      return;
    }

    // ── 5. Inject user context and call the inner handler ─────────────────
    req.user = { userId, role: user.role };
    return handler(req, res);
  };
}
