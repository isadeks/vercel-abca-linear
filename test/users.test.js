import { describe, it, expect, beforeEach } from 'vitest';
import { findByEmail, findById, createUser, listUsers, _resetForTests } from '../api/_lib/users.js';

describe('users', () => {
  beforeEach(() => {
    _resetForTests();
  });

  describe('seed data', () => {
    it('seeds an admin user', () => {
      const admin = findByEmail('admin@wander.test');
      expect(admin).toBeDefined();
      expect(admin.role).toBe('admin');
    });

    it('seeds a regular user', () => {
      const user = findByEmail('user@wander.test');
      expect(user).toBeDefined();
      expect(user.role).toBe('user');
    });

    it('listUsers returns two seed users without passwordHash', () => {
      const users = listUsers();
      expect(users).toHaveLength(2);
      users.forEach(u => {
        expect(u.passwordHash).toBeUndefined();
        expect(u.id).toBeDefined();
        expect(u.email).toBeDefined();
        expect(u.role).toBeDefined();
      });
    });
  });

  describe('findByEmail', () => {
    it('returns undefined for unknown email', () => {
      expect(findByEmail('nobody@example.com')).toBeUndefined();
    });

    it('is case-insensitive', () => {
      const u = findByEmail('ADMIN@WANDER.TEST');
      expect(u).toBeDefined();
      expect(u.role).toBe('admin');
    });
  });

  describe('findById', () => {
    it('returns a user by id', () => {
      const admin = findByEmail('admin@wander.test');
      expect(findById(admin.id)).toBe(admin);
    });

    it('returns undefined for unknown id', () => {
      expect(findById('999')).toBeUndefined();
    });
  });

  describe('createUser', () => {
    it('creates a new user and returns public fields', () => {
      const user = createUser({ email: 'new@test.com', passwordHash: 'hash123' });
      expect(user.id).toBeDefined();
      expect(user.email).toBe('new@test.com');
      expect(user.role).toBe('user');
      expect(user.passwordHash).toBeUndefined();
    });

    it('allows creating an admin user explicitly', () => {
      const user = createUser({ email: 'boss@test.com', passwordHash: 'h', role: 'admin' });
      expect(user.role).toBe('admin');
    });

    it('throws if email already registered', () => {
      expect(() =>
        createUser({ email: 'admin@wander.test', passwordHash: 'h' })
      ).toThrow('already registered');
    });

    it('normalises email to lowercase', () => {
      const user = createUser({ email: 'Hello@Test.COM', passwordHash: 'h' });
      expect(user.email).toBe('hello@test.com');
    });
  });
});
