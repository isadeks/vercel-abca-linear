// Vercel Serverless Function — /api/me
//
// Returns the currently authenticated user's profile.
// Requires at least the "viewer" role (i.e. any authenticated user).
//
// Response (200):
//   { userId: string, role: string }
//
// Errors:
//   401 — not authenticated (missing or invalid session cookie)
//   403 — authenticated but insufficient role (should not normally occur for
//          viewer-level access, but included for completeness)
//
// Required env var:
//   JWT_SECRET — used by the RBAC middleware to verify the access token

import { requireRole } from './_lib/rbac.js';
import { ROLES } from './_lib/roles.js';

export default requireRole(ROLES.VIEWER, async (req, res) => {
  // req.user is injected by requireRole: { userId, role }
  res.status(200).json({ userId: req.user.userId, role: req.user.role });
});
