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
//     email      : string  (unique)
//     passwordHash: string
//     createdAt  : number  (epoch-seconds)
//
//   sessions
//     userId      : string  (FK → users.id, 1-to-1; update on re-login)
//     accessToken : string
//     refreshToken: string
//     createdAt   : number  (epoch-seconds)
//     expiresAt   : number  (epoch-seconds)
//
//   accounts  (reserved for OAuth / social login, not wired up yet)
//     id         : string
//     userId     : string  (FK → users.id)
//     provider   : string  ("google" | "github" | …)
//     providerAccountId: string
//
// Adapter interface (TypeScript-style signatures for documentation):
//   create(sessionData: SessionRecord): Promise<SessionRecord>
//   findByUserId(userId: string):       Promise<SessionRecord | null>
//   update(userId: string, data: Partial<SessionRecord>): Promise<SessionRecord>
//   delete(userId: string):             Promise<void>

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
