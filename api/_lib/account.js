/**
 * account.js — In-memory user account data model and CRUD helpers.
 *
 * This is the shared foundation for all account-management features.
 * It exports a minimal, framework-free API that every subsequent
 * account feature can import without duplicating data-access code.
 *
 * Data is held in a plain Map keyed by userId (string). Each record
 * conforms to the shape produced by `createUser()`.
 */

/** @type {Map<string, object>} */
const store = new Map();

/**
 * Build a fresh user record with safe defaults.
 *
 * @param {string} userId  - Unique identifier (caller-supplied, e.g. UUID).
 * @param {object} fields  - Initial field values (see schema below).
 * @returns {object}  The new user record.
 *
 * Schema
 * ──────
 * Profile:
 *   displayName   {string}   Human-readable name.
 *   email         {string}   Primary contact address.
 *   bio           {string}   Short free-text biography.
 *   avatarUrl     {string}   URL of profile image.
 *
 * Auth / security:
 *   passwordHash  {string}   bcrypt/argon2 placeholder — never store plaintext.
 *   twoFactorEnabled  {boolean}  Whether TOTP 2FA is active.
 *   twoFactorSecret   {string|null}  Encrypted TOTP secret (null when disabled).
 *
 * Notifications:
 *   notifyEmail   {boolean}  Receive notifications by e-mail.
 *   notifySms     {boolean}  Receive notifications by SMS.
 *   notifyPush    {boolean}  Receive in-app push notifications.
 *
 * Lifecycle:
 *   deleted       {boolean}  Soft-delete flag; deleted users are excluded by default.
 *   createdAt     {string}   ISO 8601 creation timestamp.
 *   updatedAt     {string}   ISO 8601 last-modified timestamp.
 */
function createUserRecord(userId, fields = {}) {
  const now = new Date().toISOString();
  return {
    // identity
    userId,
    // profile
    displayName: fields.displayName ?? '',
    email: fields.email ?? '',
    bio: fields.bio ?? '',
    avatarUrl: fields.avatarUrl ?? '',
    // auth / security
    passwordHash: fields.passwordHash ?? '',
    twoFactorEnabled: fields.twoFactorEnabled ?? false,
    twoFactorSecret: fields.twoFactorSecret ?? null,
    // notification preferences
    notifyEmail: fields.notifyEmail ?? true,
    notifySms: fields.notifySms ?? false,
    notifyPush: fields.notifyPush ?? true,
    // lifecycle
    deleted: false,
    createdAt: fields.createdAt ?? now,
    updatedAt: fields.updatedAt ?? now,
  };
}

// ── CRUD helpers ────────────────────────────────────────────────────────────

/**
 * Create a new user account and persist it in the store.
 *
 * @param {string} userId  - Unique identifier.
 * @param {object} [fields] - Optional initial field values.
 * @returns {object}  The created user record.
 * @throws {Error}  If `userId` is already taken.
 */
export function createUser(userId, fields = {}) {
  if (!userId || typeof userId !== 'string') {
    throw new Error('createUser: userId must be a non-empty string');
  }
  if (store.has(userId)) {
    throw new Error(`createUser: userId "${userId}" already exists`);
  }
  const record = createUserRecord(userId, fields);
  store.set(userId, record);
  return { ...record };
}

/**
 * Retrieve a user by ID.
 *
 * @param {string} userId
 * @param {{ includeDeleted?: boolean }} [opts]
 * @returns {object|null}  A shallow copy of the record, or null if not found.
 */
export function getUser(userId, { includeDeleted = false } = {}) {
  const record = store.get(userId);
  if (!record) return null;
  if (record.deleted && !includeDeleted) return null;
  return { ...record };
}

/**
 * Update mutable fields on an existing user record.
 * The `userId`, `createdAt`, and `deleted` fields are immutable via this helper
 * (use `deleteUser` to soft-delete).
 *
 * @param {string} userId
 * @param {object} changes  - Partial record with fields to update.
 * @returns {object}  The updated record (shallow copy).
 * @throws {Error}  If the user does not exist or has been deleted.
 */
export function updateUser(userId, changes = {}) {
  const record = store.get(userId);
  if (!record) throw new Error(`updateUser: user "${userId}" not found`);
  if (record.deleted) throw new Error(`updateUser: user "${userId}" is deleted`);

  // Prevent callers from overwriting identity / lifecycle fields accidentally.
  // eslint-disable-next-line no-unused-vars
  const { userId: _u, createdAt: _c, deleted: _d, ...safeChanges } = changes;

  const updated = {
    ...record,
    ...safeChanges,
    updatedAt: new Date().toISOString(),
  };
  store.set(userId, updated);
  return { ...updated };
}

/**
 * Soft-delete a user account (sets `deleted: true`).
 * Soft-deleted records remain in the store but are invisible to `getUser`
 * and `listUsers` unless `includeDeleted` is true.
 *
 * @param {string} userId
 * @returns {object}  The updated record with `deleted: true`.
 * @throws {Error}  If the user does not exist or is already deleted.
 */
export function deleteUser(userId) {
  const record = store.get(userId);
  if (!record) throw new Error(`deleteUser: user "${userId}" not found`);
  if (record.deleted) throw new Error(`deleteUser: user "${userId}" is already deleted`);

  const updated = { ...record, deleted: true, updatedAt: new Date().toISOString() };
  store.set(userId, updated);
  return { ...updated };
}

/**
 * List all active (non-deleted) users.
 *
 * @param {{ includeDeleted?: boolean }} [opts]
 * @returns {object[]}  Array of shallow-copied user records.
 */
export function listUsers({ includeDeleted = false } = {}) {
  const results = [];
  for (const record of store.values()) {
    if (record.deleted && !includeDeleted) continue;
    results.push({ ...record });
  }
  return results;
}

/**
 * Remove ALL records from the in-memory store.
 * Intended for test isolation only — do not call in production code.
 *
 * @returns {void}
 */
export function _resetStore() {
  store.clear();
}
