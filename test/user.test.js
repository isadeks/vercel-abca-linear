import { describe, it, expect, beforeEach } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  createUser,
  findUserByEmail,
  _resetStore,
} from '../api/_lib/user.js';

beforeEach(() => _resetStore());

describe('hashPassword', () => {
  it('produces a bcrypt hash', async () => {
    const hash = await hashPassword('password123');
    expect(hash).toMatch(/^\$2[ab]\$/);
  });

  it('throws when password is too short', async () => {
    await expect(hashPassword('short')).rejects.toThrow('at least 8 characters');
  });

  it('throws when password is missing', async () => {
    await expect(hashPassword('')).rejects.toThrow();
  });
});

describe('verifyPassword', () => {
  it('returns true for matching password', async () => {
    const hash = await hashPassword('correcthorse');
    expect(await verifyPassword('correcthorse', hash)).toBe(true);
  });

  it('returns false for wrong password', async () => {
    const hash = await hashPassword('correcthorse');
    expect(await verifyPassword('wrongpassword', hash)).toBe(false);
  });

  it('returns false when either argument is falsy', async () => {
    expect(await verifyPassword('', 'hash')).toBe(false);
    expect(await verifyPassword('pass', '')).toBe(false);
  });
});

describe('createUser', () => {
  it('creates a user and returns public fields', async () => {
    const user = await createUser({ email: 'Alice@Example.com', password: 'securepass' });
    expect(user.email).toBe('alice@example.com');
    expect(user.provider).toBe('local');
    expect(user.id).toBeTruthy();
    expect(user.passwordHash).toBeUndefined(); // not exposed
  });

  it('throws on duplicate email', async () => {
    await createUser({ email: 'dup@example.com', password: 'password1' });
    await expect(createUser({ email: 'dup@example.com', password: 'password2' }))
      .rejects.toThrow('already registered');
  });

  it('throws when email is missing', async () => {
    await expect(createUser({ email: '', password: 'password1' })).rejects.toThrow();
  });
});

describe('findUserByEmail', () => {
  it('returns user by email (case-insensitive)', async () => {
    await createUser({ email: 'find@example.com', password: 'testpass1' });
    const found = findUserByEmail('FIND@EXAMPLE.COM');
    expect(found).not.toBeNull();
    expect(found.email).toBe('find@example.com');
    expect(found.passwordHash).toBeTruthy(); // internal record has hash
  });

  it('returns null for unknown email', () => {
    expect(findUserByEmail('nobody@example.com')).toBeNull();
  });

  it('returns null when email is falsy', () => {
    expect(findUserByEmail('')).toBeNull();
    expect(findUserByEmail(null)).toBeNull();
  });
});
