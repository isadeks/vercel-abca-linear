import { describe, it, expect, beforeEach } from 'vitest';
import { register, login, signToken, verifyToken } from '../api/_lib/auth.js';
import { _resetForTests } from '../api/_lib/users.js';

describe('auth', () => {
  beforeEach(() => {
    _resetForTests();
  });

  // ─── signToken / verifyToken ──────────────────────────────────────────────

  describe('signToken / verifyToken', () => {
    it('signs and verifies a valid token', async () => {
      const user = { id: '42', email: 'x@test.com', role: 'user' };
      const token = await signToken(user);
      expect(typeof token).toBe('string');

      const payload = await verifyToken(token);
      expect(payload.sub).toBe('42');
      expect(payload.email).toBe('x@test.com');
      expect(payload.role).toBe('user');
    });

    it('rejects a tampered token', async () => {
      const token = await signToken({ id: '1', email: 'a@b.com', role: 'user' });
      const tampered = token.slice(0, -5) + 'XXXXX';
      await expect(verifyToken(tampered)).rejects.toThrow();
    });
  });

  // ─── register ────────────────────────────────────────────────────────────

  describe('register', () => {
    it('registers a new user and returns user + token', async () => {
      const result = await register({ email: 'alice@test.com', password: 'password1' });
      expect(result.user.email).toBe('alice@test.com');
      expect(result.user.role).toBe('user');
      expect(result.user.passwordHash).toBeUndefined();
      expect(typeof result.token).toBe('string');
    });

    it('token payload matches the new user', async () => {
      const { user, token } = await register({ email: 'bob@test.com', password: 'password2' });
      const payload = await verifyToken(token);
      expect(payload.sub).toBe(user.id);
      expect(payload.role).toBe('user');
    });

    it('allows registering an admin', async () => {
      const { user } = await register({
        email: 'superadmin@test.com',
        password: 'securepass',
        role: 'admin',
      });
      expect(user.role).toBe('admin');
    });

    it('rejects a duplicate email', async () => {
      await register({ email: 'dup@test.com', password: 'password3' });
      await expect(
        register({ email: 'dup@test.com', password: 'password4' })
      ).rejects.toThrow('already registered');
    });

    it('rejects a short password', async () => {
      await expect(
        register({ email: 'short@test.com', password: 'abc' })
      ).rejects.toThrow('at least 8 characters');
    });

    it('rejects missing email', async () => {
      await expect(register({ password: 'password1' })).rejects.toThrow('email is required');
    });

    it('rejects an invalid role', async () => {
      await expect(
        register({ email: 'bad@test.com', password: 'password1', role: 'superuser' })
      ).rejects.toThrow('role must be admin or user');
    });
  });

  // ─── login ───────────────────────────────────────────────────────────────

  describe('login', () => {
    it('logs in with seeded admin credentials', async () => {
      const result = await login({ email: 'admin@wander.test', password: 'admin-pass-1' });
      expect(result.user.email).toBe('admin@wander.test');
      expect(result.user.role).toBe('admin');
      expect(typeof result.token).toBe('string');
    });

    it('logs in with seeded regular user credentials', async () => {
      const result = await login({ email: 'user@wander.test', password: 'user-pass-1' });
      expect(result.user.role).toBe('user');
    });

    it('token sub matches user id', async () => {
      const { user, token } = await login({ email: 'admin@wander.test', password: 'admin-pass-1' });
      const payload = await verifyToken(token);
      expect(payload.sub).toBe(user.id);
    });

    it('rejects wrong password', async () => {
      await expect(
        login({ email: 'admin@wander.test', password: 'wrong-pass' })
      ).rejects.toThrow('Invalid credentials');
    });

    it('rejects unknown email', async () => {
      await expect(
        login({ email: 'nobody@wander.test', password: 'admin-pass-1' })
      ).rejects.toThrow('Invalid credentials');
    });

    it('rejects missing password', async () => {
      await expect(
        login({ email: 'admin@wander.test' })
      ).rejects.toThrow('email and password are required');
    });
  });
});
