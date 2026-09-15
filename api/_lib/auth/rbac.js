// Role-Based Access Control helpers.
// Roles are strings embedded in the JWT claims (e.g. "user", "admin").

/** Available roles, from least to most privileged. */
export const ROLES = Object.freeze({
  USER: 'user',
  ADMIN: 'admin',
});

/**
 * Assert that the authenticated claims include at least one of the required roles.
 * Throws if the check fails.
 * @param {object} claims        - Decoded JWT claims (must have a `roles` array)
 * @param {string[]} required    - At least one of these must be present
 */
export function requireRoles(claims, required) {
  if (!claims || !Array.isArray(claims.roles)) {
    throw new Error('Access denied: no roles present in token');
  }
  const hasRole = required.some((r) => claims.roles.includes(r));
  if (!hasRole) {
    throw new Error(`Access denied: requires one of [${required.join(', ')}]`);
  }
}

/**
 * Middleware-style wrapper for Vercel serverless functions.
 * Runs the inner handler only if authentication succeeds and the caller has at
 * least one of the required roles.
 *
 * @param {function} handler      - (req, res, claims) => Promise<void>
 * @param {string[]} roles        - Required role(s)
 * @param {function} authenticate - (authHeader: string) => claims (from sessions.js)
 * @returns {function} Vercel-compatible request handler
 */
export function withRoles(handler, roles, authenticate) {
  return async (req, res) => {
    try {
      const claims = authenticate(req.headers['authorization']);
      requireRoles(claims, roles);
      await handler(req, res, claims);
    } catch (err) {
      res.status(401).json({ error: err.message });
    }
  };
}
