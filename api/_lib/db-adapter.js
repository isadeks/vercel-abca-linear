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
//   passwordResetTokens
//     jti        : string  (primary key — JWT ID, for single-use enforcement)
//     userId     : string  (FK → users.id)
//     expiresAt  : number  (epoch-seconds)
//     usedAt     : number | null  (epoch-seconds; null = not yet used)
//
// Session adapter interface (TypeScript-style signatures for documentation):
//   create(sessionData: SessionRecord): Promise<SessionRecord>
//   findByUserId(userId: string):       Promise<SessionRecord | null>
//   update(userId: string, data: Partial<SessionRecord>): Promise<SessionRecord>
//   delete(userId: string):             Promise<void>
//
// User adapter interface:
//   createUser(userData: UserRecord): Promise<UserRecord>
//   findUserByEmail(email: string):   Promise<UserRecord | null>
//   findUserById(id: string):         Promise<UserRecord | null>
//   updateUser(id: string, data: Partial<UserRecord>): Promise<UserRecord>
//
// PasswordResetToken adapter interface:
//   createResetToken(data: ResetTokenRecord): Promise<ResetTokenRecord>
//   findResetToken(jti: string):              Promise<ResetTokenRecord | null>
//   markResetTokenUsed(jti: string):          Promise<void>

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
 * Build a lightweight in-memory user store.
 * Suitable for unit tests and local development; NOT persistent across restarts.
 *
 * @returns {{ createUser, findUserByEmail, findUserById, updateUser }}
 */
export function buildInMemoryUserAdapter() {
  /** @type {Map<string, object>}  keyed by id */
  const byId = new Map();
  /** @type {Map<string, string>}  email → id */
  const emailIndex = new Map();

  return {
    async createUser(userData) {
      if (emailIndex.has(userData.email)) {
        throw new Error('Email already in use: ' + userData.email);
      }
      byId.set(userData.id, { ...userData });
      emailIndex.set(userData.email, userData.id);
      return { ...userData };
    },

    async findUserByEmail(email) {
      const id = emailIndex.get(email);
      if (!id) return null;
      const record = byId.get(id);
      return record ? { ...record } : null;
    },

    async findUserById(id) {
      const record = byId.get(id);
      return record ? { ...record } : null;
    },

    async updateUser(id, data) {
      const existing = byId.get(id);
      if (!existing) throw new Error('User not found: ' + id);
      // Handle email change — update index
      if (data.email && data.email !== existing.email) {
        emailIndex.delete(existing.email);
        emailIndex.set(data.email, id);
      }
      const updated = { ...existing, ...data };
      byId.set(id, updated);
      return { ...updated };
    },
  };
}

/**
 * Build a lightweight in-memory password-reset token store.
 * Suitable for unit tests and local development; NOT persistent across restarts.
 *
 * @returns {{ createResetToken, findResetToken, markResetTokenUsed }}
 */
export function buildInMemoryResetTokenAdapter() {
  /** @type {Map<string, object>}  keyed by jti */
  const store = new Map();

  return {
    async createResetToken(data) {
      store.set(data.jti, { ...data });
      return { ...data };
    },

    async findResetToken(jti) {
      const record = store.get(jti);
      return record ? { ...record } : null;
    },

    async markResetTokenUsed(jti) {
      const record = store.get(jti);
      if (!record) throw new Error('Reset token not found: ' + jti);
      store.set(jti, { ...record, usedAt: Math.floor(Date.now() / 1000) });
    },
  };
}
