// api/_lib/team.js — in-memory team-member store and workload-calculation helpers

/** @type {Array<{id:string, name:string, role:string, openItems:number, inProgressItems:number}>} */
const TEAM_MEMBERS = [
  { id: 'u1', name: 'Alice Chambers', role: 'Editor',        openItems: 4, inProgressItems: 2 },
  { id: 'u2', name: 'Ben Nakamura',   role: 'Photographer',  openItems: 7, inProgressItems: 1 },
  { id: 'u3', name: 'Cleo Martins',   role: 'Travel Writer', openItems: 3, inProgressItems: 3 },
  { id: 'u4', name: 'Demi Hassan',    role: 'UX Designer',   openItems: 5, inProgressItems: 0 },
  { id: 'u5', name: 'Eli Foster',     role: 'Developer',     openItems: 2, inProgressItems: 4 },
];

/**
 * Return a shallow copy of all team members.
 * @returns {Array<{id:string, name:string, role:string, openItems:number, inProgressItems:number}>}
 */
export function getAllMembers() {
  return TEAM_MEMBERS.map(m => ({ ...m }));
}

/**
 * Calculate the workload score for a member.
 * In-progress items are weighted 2× as heavy as open items.
 * @param {{ openItems: number, inProgressItems: number }} member
 * @returns {number}
 */
export function workloadScore(member) {
  return member.openItems + member.inProgressItems * 2;
}

/**
 * Return members sorted by workload score, highest first.
 * @returns {Array<{id:string, name:string, role:string, openItems:number, inProgressItems:number}>}
 */
export function getMembersByWorkload() {
  return getAllMembers().sort((a, b) => workloadScore(b) - workloadScore(a));
}

/**
 * Find a single member by id.  Returns a copy, or null if not found.
 * @param {string} id
 * @returns {{id:string, name:string, role:string, openItems:number, inProgressItems:number}|null}
 */
export function getMemberById(id) {
  const member = TEAM_MEMBERS.find(m => m.id === id);
  return member ? { ...member } : null;
}
