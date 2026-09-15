import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, generateResetToken } from '../../api/_lib/auth/password.js';

describe('password', () => {
  it('hashes and verifies a password', () => {
    const hash = hashPassword('correct-horse-battery-staple');
    expect(verifyPassword('correct-horse-battery-staple', hash)).toBe(true);
  });

  it('rejects a wrong password', () => {
    const hash = hashPassword('correct-horse-battery-staple');
    expect(verifyPassword('wrong-password', hash)).toBe(false);
  });

  it('produces different hashes for the same password (random salt)', () => {
    const h1 = hashPassword('same');
    const h2 = hashPassword('same');
    expect(h1).not.toBe(h2);
    expect(verifyPassword('same', h1)).toBe(true);
    expect(verifyPassword('same', h2)).toBe(true);
  });

  it('generates a random reset token', () => {
    const t1 = generateResetToken();
    const t2 = generateResetToken();
    expect(t1).toHaveLength(64); // 32 bytes as hex
    expect(t1).not.toBe(t2);
  });
});
