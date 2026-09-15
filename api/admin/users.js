// GET /api/admin/users — admin-only endpoint demonstrating RBAC.
import { authenticateRequest } from '../_lib/auth/sessions.js';
import { withRoles, ROLES } from '../_lib/auth/rbac.js';

async function listUsers(req, res, claims) {
  // In production this would query the DB. Return the caller's claims as demo.
  res.status(200).json({ message: 'Admin access granted', callerRoles: claims.roles, sub: claims.sub });
}

export default withRoles(listUsers, [ROLES.ADMIN], authenticateRequest);
