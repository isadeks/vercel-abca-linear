import { describe, it, expect, beforeEach } from 'vitest';
import { resetStore } from '../api/_lib/store.js';
import {
  createUser,
  findUserByEmail,
  findUserById,
  authenticate,
  publicUser,
} from '../api/_lib/users.js';

describe('users', () => {
  beforeEach(() => {
    resetStore();
  });

  it('creates a user and finds it by email + id', async () => {
    const user = await createUser('New@User.com', 'password123');
    expect(user.id).toBeTruthy();
    expect(user.email).toBe('new@user.com'); // normalized

    expect((await findUserByEmail('new@user.com')).id).toBe(user.id);
    expect((await findUserById(user.id)).id).toBe(user.id);
  });

  it('never stores the plaintext password', async () => {
    const user = await createUser('a@b.com', 'supersecret');
    expect(user.passwordHash).not.toContain('supersecret');
  });

  it('rejects an invalid email', async () => {
    await expect(createUser('bad-email', 'password123')).rejects.toMatchObject({
      code: 'INVALID_EMAIL',
    });
  });

  it('rejects a too-short password', async () => {
    await expect(createUser('a@b.com', 'short')).rejects.toMatchObject({
      code: 'WEAK_PASSWORD',
    });
  });

  it('rejects a duplicate email (case-insensitive)', async () => {
    await createUser('dup@b.com', 'password123');
    await expect(createUser('DUP@b.com', 'password123')).rejects.toMatchObject({
      code: 'EMAIL_TAKEN',
    });
  });

  it('authenticates with correct credentials', async () => {
    await createUser('login@b.com', 'password123');
    const user = await authenticate('LOGIN@b.com', 'password123');
    expect(user).toBeTruthy();
    expect(user.email).toBe('login@b.com');
  });

  it('returns null for wrong password or unknown user', async () => {
    await createUser('login@b.com', 'password123');
    expect(await authenticate('login@b.com', 'wrong')).toBeNull();
    expect(await authenticate('nobody@b.com', 'password123')).toBeNull();
  });

  it('publicUser strips secrets', async () => {
    const user = await createUser('pub@b.com', 'password123');
    const pub = publicUser(user);
    expect(pub).toEqual({ id: user.id, email: user.email, createdAt: user.createdAt });
    expect(pub.passwordHash).toBeUndefined();
    expect(publicUser(null)).toBeNull();
  });
});
