import { describe, it, expect, beforeEach } from 'vitest';
import { createResetToken, redeemResetToken, _clearResetTokens } from '../../api/_lib/auth/reset.js';

beforeEach(() => _clearResetTokens());

describe('reset', () => {
  it('creates and redeems a reset token', () => {
    const token = createResetToken('user-123');
    const userId = redeemResetToken(token);
    expect(userId).toBe('user-123');
  });

  it('single-use: rejects a second redemption', () => {
    const token = createResetToken('user-456');
    redeemResetToken(token);
    expect(() => redeemResetToken(token)).toThrow('Invalid or already-used reset token');
  });

  it('rejects an unknown token', () => {
    expect(() => redeemResetToken('not-a-real-token')).toThrow('Invalid or already-used reset token');
  });
});
