/**
 * userStore.js — shared in-memory user store
 *
 * Exports a single Map<email, { id, email, passwordHash }> that is shared
 * between the register and login serverless functions within the same
 * warm Lambda instance.
 *
 * NOTE: this store is ephemeral — data is lost when the instance is recycled.
 * A future task should replace this with a persistent store (KV, Postgres, etc.).
 */

export const users = new Map();
