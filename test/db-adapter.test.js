import { describe, it, expect, beforeEach } from 'vitest';
import { buildInMemoryAdapter } from '../api/_lib/db-adapter.js';

const SAMPLE = {
  userId: 'u-1',
  accessToken: 'access.token.here',
  refreshToken: 'refresh.token.here',
  createdAt: 1000,
  expiresAt: 605800,
};

let adapter;

beforeEach(() => {
  adapter = buildInMemoryAdapter();
});

describe('buildInMemoryAdapter', () => {
  describe('create', () => {
    it('stores and returns the session', async () => {
      const result = await adapter.create(SAMPLE);
      expect(result).toEqual(SAMPLE);
    });

    it('returns a copy (mutation does not affect store)', async () => {
      const result = await adapter.create(SAMPLE);
      result.accessToken = 'mutated';
      const stored = await adapter.findByUserId(SAMPLE.userId);
      expect(stored.accessToken).toBe(SAMPLE.accessToken);
    });
  });

  describe('findByUserId', () => {
    it('returns null for unknown user', async () => {
      expect(await adapter.findByUserId('ghost')).toBeNull();
    });

    it('returns the stored session', async () => {
      await adapter.create(SAMPLE);
      const result = await adapter.findByUserId(SAMPLE.userId);
      expect(result).toEqual(SAMPLE);
    });
  });

  describe('update', () => {
    it('merges partial data into the session', async () => {
      await adapter.create(SAMPLE);
      const updated = await adapter.update(SAMPLE.userId, {
        accessToken: 'new-access',
      });
      expect(updated.accessToken).toBe('new-access');
      expect(updated.refreshToken).toBe(SAMPLE.refreshToken);
    });

    it('throws for unknown user', async () => {
      await expect(adapter.update('ghost', {})).rejects.toThrow('Session not found');
    });
  });

  describe('delete', () => {
    it('removes the session', async () => {
      await adapter.create(SAMPLE);
      await adapter.delete(SAMPLE.userId);
      expect(await adapter.findByUserId(SAMPLE.userId)).toBeNull();
    });

    it('is a no-op for unknown user', async () => {
      await expect(adapter.delete('ghost')).resolves.toBeUndefined();
    });
  });
});
