// Database adapter — in-memory reference implementation.
//
// Production deployments replace this with a real adapter backed by the
// target database (Postgres, PlanetScale, Supabase, etc.).  The contract
// is documented below and must be satisfied by any adapter passed to
// `setSessionAdapter()` in session.js.
//
// Required tables / collections
// ──────────────────────────────
//   users
//     id         : string  (primary key, e.g. UUID)
//     email      : string  (unique, nullable for OAuth-only accounts)
//     name       : string
//     role       : string  ("viewer" | "editor" | "admin"; default "viewer")
//     createdAt  : number  (epoch-seconds)
//
//   sessions
//     userId      : string  (FK → users.id, 1-to-1; update on re-login)
//     accessToken : string
//     refreshToken: string
//     createdAt   : number  (epoch-seconds)
//     expiresAt   : number  (epoch-seconds)
//
//   accounts  (OAuth / social login)
//     id               : string
//     userId           : string  (FK → users.id)
//     provider         : string  ("google" | "github")
//     providerAccountId: string  (unique per provider)
//
// Session adapter interface (TypeScript-style signatures for documentation):
//   create(sessionData: SessionRecord): Promise<SessionRecord>
//   findByUserId(userId: string):       Promise<SessionRecord | null>
//   update(userId: string, data: Partial<SessionRecord>): Promise<SessionRecord>
//   delete(userId: string):             Promise<void>
//
// User adapter interface:
//   createUser(userData: { id, email, name, createdAt }): Promise<UserRecord>
//   findUserById(id: string):                              Promise<UserRecord | null>
//   findUserByEmail(email: string):                        Promise<UserRecord | null>
//   updateUserRole(id: string, role: string):              Promise<UserRecord>
//
// Account adapter interface:
//   createAccount(accountData: { id, userId, provider, providerAccountId }): Promise<AccountRecord>
//   findAccountByProvider(provider: string, providerAccountId: string):       Promise<AccountRecord | null>

import { randomBytes } from 'node:crypto';

/**
 * Generate a UUID-shaped random ID.
 * @returns {string}
 */
function generateId() {
  return randomBytes(16).toString('hex');
}

/**
 * Build a lightweight in-memory session store.
 * Suitable for unit tests and local development; NOT persistent across restarts.
 *
 * @returns {{ create, findByUserId, update, delete }}
 */
export function buildInMemoryAdapter() {
  /** @type {Map<string, object>} */
  const store = new Map();

  return {
    async create(sessionData) {
      store.set(sessionData.userId, { ...sessionData });
      return { ...sessionData };
    },

    async findByUserId(userId) {
      const record = store.get(userId);
      return record ? { ...record } : null;
    },

    async update(userId, data) {
      const existing = store.get(userId);
      if (!existing) throw new Error('Session not found: ' + userId);
      const updated = { ...existing, ...data };
      store.set(userId, updated);
      return { ...updated };
    },

    async delete(userId) {
      store.delete(userId);
    },
  };
}

/**
 * Build a lightweight in-memory user + account store.
 * Suitable for unit tests and local development; NOT persistent across restarts.
 *
 * @returns {{ createUser, findUserById, findUserByEmail, createAccount, findAccountByProvider }}
 */
export function buildInMemoryUserAdapter() {
  /** @type {Map<string, object>} userId → user */
  const users = new Map();
  /** @type {Map<string, object>} email → user */
  const usersByEmail = new Map();
  /** @type {Map<string, object>} "provider:providerAccountId" → account */
  const accounts = new Map();

  return {
    async createUser({ email, name, role = 'viewer' }) {
      const id = generateId();
      const now = Math.floor(Date.now() / 1000);
      const user = { id, email: email ?? null, name, role, createdAt: now };
      users.set(id, { ...user });
      if (email) usersByEmail.set(email, { ...user });
      return { ...user };
    },

    async findUserById(id) {
      const record = users.get(id);
      return record ? { ...record } : null;
    },

    async findUserByEmail(email) {
      const record = usersByEmail.get(email);
      return record ? { ...record } : null;
    },

    async createAccount({ userId, provider, providerAccountId }) {
      const id = generateId();
      const account = { id, userId, provider, providerAccountId };
      accounts.set(`${provider}:${providerAccountId}`, { ...account });
      return { ...account };
    },

    async findAccountByProvider(provider, providerAccountId) {
      const record = accounts.get(`${provider}:${providerAccountId}`);
      return record ? { ...record } : null;
    },

    async updateUserRole(id, role) {
      const existing = users.get(id);
      if (!existing) throw new Error('User not found: ' + id);
      const updated = { ...existing, role };
      users.set(id, updated);
      if (updated.email) usersByEmail.set(updated.email, { ...updated });
      return { ...updated };
    },
  };
}
