/**
 * travel.js — In-memory Travel record model.
 *
 * Schema:
 *   { id: string, userId: string, countryId: string, status: 'active'|'cancelled', createdAt: string }
 *
 * Users can create, view, and cancel their own records.
 * Admins can view all records.
 */

/** @type {Array<{id: string, userId: string, countryId: string, status: string, createdAt: string}>} */
const _records = [];

let _nextId = 1;

/**
 * Create a new travel booking record.
 * @param {{ userId: string, countryId: string }} params
 * @returns {{id: string, userId: string, countryId: string, status: string, createdAt: string}}
 * @throws {Error} if userId or countryId is missing
 */
export function createTravel({ userId, countryId }) {
  if (!userId) throw new Error('userId is required');
  if (!countryId) throw new Error('countryId is required');
  const record = {
    id: String(_nextId++),
    userId,
    countryId,
    status: 'active',
    createdAt: new Date().toISOString(),
  };
  _records.push(record);
  return { ...record };
}

/**
 * Return all travel records belonging to a specific user.
 * @param {string} userId
 * @returns {Array<{id: string, userId: string, countryId: string, status: string, createdAt: string}>}
 */
export function listTravelByUser(userId) {
  return _records.filter(r => r.userId === userId).map(r => ({ ...r }));
}

/**
 * Return all travel records (admin view).
 * @returns {Array<{id: string, userId: string, countryId: string, status: string, createdAt: string}>}
 */
export function listAllTravel() {
  return _records.map(r => ({ ...r }));
}

/**
 * Find a travel record by id.
 * @param {string} id
 * @returns {{id: string, userId: string, countryId: string, status: string, createdAt: string}|undefined}
 */
export function findTravelById(id) {
  const r = _records.find(r => r.id === id);
  return r ? { ...r } : undefined;
}

/**
 * Cancel a travel record (set status to 'cancelled').
 * The caller is responsible for verifying ownership before calling this.
 *
 * @param {string} id
 * @returns {{id: string, userId: string, countryId: string, status: string, createdAt: string}}
 * @throws {Error} if record not found or already cancelled
 */
export function cancelTravel(id) {
  const record = _records.find(r => r.id === id);
  if (!record) throw new Error(`Travel record not found: ${id}`);
  if (record.status === 'cancelled') throw new Error('Travel record is already cancelled');
  record.status = 'cancelled';
  return { ...record };
}

/**
 * Reset to empty state — for tests only.
 */
export function _resetForTests() {
  _records.length = 0;
  _nextId = 1;
}
