import { describe, it, expect, beforeEach } from 'vitest';
import {
  createUser, findUserByEmail, findUserById,
  findUserByOAuth, updateUser, _clearUsers,
} from '../../api/_lib/auth/users.js';

beforeEach(() => _clearUsers());

describe('users', () => {
  it('creates and finds a user by email', () => {
    const u = createUser({ email: 'alice@example.com' });
    expect(u.email).toBe('alice@example.com');
    expect(u.roles).toEqual(['user']);
    const found = findUserByEmail('alice@example.com');
    expect(found.id).toBe(u.id);
  });

  it('finds a user by id', () => {
    const u = createUser({ email: 'bob@example.com' });
    expect(findUserById(u.id).email).toBe('bob@example.com');
  });

  it('returns null for unknown email / id', () => {
    expect(findUserByEmail('nobody@example.com')).toBeNull();
    expect(findUserById('does-not-exist')).toBeNull();
  });

  it('finds a user by OAuth provider', () => {
    const u = createUser({ email: 'carol@example.com', oauthProviders: { github: 'gh-42' } });
    expect(findUserByOAuth('github', 'gh-42').id).toBe(u.id);
    expect(findUserByOAuth('google', 'gh-42')).toBeNull();
  });

  it('updates a user', () => {
    const u = createUser({ email: 'dave@example.com' });
    updateUser(u.id, { roles: ['user', 'admin'] });
    expect(findUserById(u.id).roles).toEqual(['user', 'admin']);
  });

  it('returns null when updating an unknown user', () => {
    expect(updateUser('unknown', { roles: [] })).toBeNull();
  });
});
