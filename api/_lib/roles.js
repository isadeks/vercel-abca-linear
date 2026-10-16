// Role definitions and hierarchy utilities.
//
// Roles form a linear hierarchy:  viewer < editor < admin
// A user with a higher-ranked role implicitly satisfies requirements for
// any lower-ranked role (e.g. an admin can access editor and viewer routes).

// ── Role constants ────────────────────────────────────────────────────────────

/**
 * Canonical role names.  Use these constants instead of raw strings so that
 * typos are caught at lint/test time.
 *
 * @type {{ VIEWER: string, EDITOR: string, ADMIN: string }}
 */
export const ROLES = Object.freeze({
  VIEWER: 'viewer',
  EDITOR: 'editor',
  ADMIN:  'admin',
});

/**
 * All valid role values, ordered from least to most privileged.
 * @type {string[]}
 */
export const ROLE_LIST = [ROLES.VIEWER, ROLES.EDITOR, ROLES.ADMIN];

// ── Internal rank table ───────────────────────────────────────────────────────

/** @type {Record<string, number>} */
const ROLE_RANK = {
  [ROLES.VIEWER]: 0,
  [ROLES.EDITOR]: 1,
  [ROLES.ADMIN]:  2,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Return true when `userRole` satisfies `requiredRole` (i.e. is at least as
 * privileged).  Unknown roles are treated as rank -1 (always fails).
 *
 * @param {string} userRole     The role stored on the user record.
 * @param {string} requiredRole The minimum role required for the route.
 * @returns {boolean}
 */
export function hasRequiredRole(userRole, requiredRole) {
  const userRank = ROLE_RANK[userRole]     ?? -1;
  const reqRank  = ROLE_RANK[requiredRole] ?? Infinity;
  return userRank >= reqRank;
}

/**
 * Return true when the given string is a known role value.
 * @param {string} role
 * @returns {boolean}
 */
export function isValidRole(role) {
  return Object.prototype.hasOwnProperty.call(ROLE_RANK, role);
}
