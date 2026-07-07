import { describe, it, expect, beforeEach } from 'vitest';
import {
  base32Encode,
  base32Decode,
  hotp,
  generateTotp,
  verifyTotp,
  generateTotpSecret,
  getTotpUri,
  setupTwoFactor,
  enableTwoFactor,
  disableTwoFactor,
} from '../api/_lib/twoFactor.js';
import { createUser, getUser, _resetStore } from '../api/_lib/account.js';

// Reset in-memory store before every test.
beforeEach(() => {
  _resetStore();
});

// ── base32 helpers ────────────────────────────────────────────────────────────

describe('base32Encode / base32Decode', () => {
  it('round-trips a known buffer', () => {
    const buf = Buffer.from([0xde, 0xad, 0xbe, 0xef]);
    const encoded = base32Encode(buf);
    const decoded = base32Decode(encoded);
    expect(Buffer.compare(decoded, buf)).toBe(0);
  });

  it('base32Encode produces only valid base32 characters', () => {
    const buf = Buffer.from('hello world');
    const encoded = base32Encode(buf);
    expect(/^[A-Z2-7]+$/.test(encoded)).toBe(true);
  });

  it('base32Decode accepts lower-case input', () => {
    const buf = Buffer.from([0xde, 0xad, 0xbe, 0xef]);
    const encoded = base32Encode(buf).toLowerCase();
    const decoded = base32Decode(encoded);
    expect(Buffer.compare(decoded, buf)).toBe(0);
  });

  it('base32Decode throws on invalid characters', () => {
    expect(() => base32Decode('INVALID!!!')).toThrow(/invalid character/);
  });

  it('base32Decode strips trailing padding', () => {
    const buf = Buffer.from([0xde, 0xad]);
    const encoded = base32Encode(buf);
    // Add padding manually — should still decode cleanly.
    const decoded = base32Decode(encoded + '====');
    expect(Buffer.compare(decoded, buf)).toBe(0);
  });
});

// ── generateTotpSecret ────────────────────────────────────────────────────────

describe('generateTotpSecret', () => {
  it('returns a non-empty string', () => {
    expect(typeof generateTotpSecret()).toBe('string');
    expect(generateTotpSecret().length).toBeGreaterThan(0);
  });

  it('returns a valid base32 string', () => {
    const secret = generateTotpSecret();
    expect(/^[A-Z2-7]+$/.test(secret)).toBe(true);
  });

  it('produces different secrets on each call', () => {
    const s1 = generateTotpSecret();
    const s2 = generateTotpSecret();
    // Astronomically unlikely to collide.
    expect(s1).not.toBe(s2);
  });

  it('encodes 20 bytes → 32 base32 characters', () => {
    // 20 bytes * 8 bits / 5 bits per char = 32 chars.
    expect(generateTotpSecret()).toHaveLength(32);
  });
});

// ── hotp ──────────────────────────────────────────────────────────────────────

describe('hotp', () => {
  // RFC 4226 Appendix D test vectors.
  // Secret: "12345678901234567890" (ASCII)
  const RFC_SECRET = base32Encode(Buffer.from('12345678901234567890', 'ascii'));

  const rfcVectors = [
    [0, '755224'],
    [1, '287082'],
    [2, '359152'],
    [3, '969429'],
    [4, '338314'],
    [5, '254676'],
    [6, '287922'],
    [7, '162583'],
    [8, '399871'],
    [9, '520489'],
  ];

  for (const [counter, expected] of rfcVectors) {
    it(`generates correct HOTP for counter=${counter}`, () => {
      expect(hotp(RFC_SECRET, counter)).toBe(expected);
    });
  }

  it('returns a zero-padded 6-digit string', () => {
    const result = hotp(RFC_SECRET, 0);
    expect(result).toHaveLength(6);
    expect(/^\d{6}$/.test(result)).toBe(true);
  });
});

// ── generateTotp / verifyTotp ─────────────────────────────────────────────────

describe('generateTotp', () => {
  it('returns a 6-digit numeric string', () => {
    const secret = generateTotpSecret();
    const token = generateTotp(secret);
    expect(/^\d{6}$/.test(token)).toBe(true);
  });

  it('produces the same token for the same time step', () => {
    const secret = generateTotpSecret();
    const now = Date.now();
    expect(generateTotp(secret, { now })).toBe(generateTotp(secret, { now }));
  });

  it('produces different tokens for steps 30 s apart (very high probability)', () => {
    const secret = generateTotpSecret();
    const t0 = 1_000_000_000_000; // fixed epoch ms
    const t1 = t0 + 30_000;       // next 30-second step
    const code0 = generateTotp(secret, { now: t0 });
    const code1 = generateTotp(secret, { now: t1 });
    expect(code0).not.toBe(code1);
  });
});

describe('verifyTotp', () => {
  it('accepts a valid token at the current time step', () => {
    const secret = generateTotpSecret();
    const now = Date.now();
    const token = generateTotp(secret, { now });
    expect(verifyTotp(secret, token, { now })).toBe(true);
  });

  it('rejects an incorrect token', () => {
    const secret = generateTotpSecret();
    const now = Date.now();
    const token = generateTotp(secret, { now });
    // Flip last digit.
    const bad = token.slice(0, 5) + String((Number(token[5]) + 1) % 10);
    expect(verifyTotp(secret, bad, { now })).toBe(false);
  });

  it('accepts a token from the previous time step (window=1)', () => {
    const secret = generateTotpSecret();
    const t0 = 1_000_000_000_000;
    const prevToken = generateTotp(secret, { now: t0 });
    const nextNow = t0 + 30_000; // one step later
    expect(verifyTotp(secret, prevToken, { window: 1, now: nextNow })).toBe(true);
  });

  it('accepts a token from the next time step (window=1)', () => {
    const secret = generateTotpSecret();
    const t0 = 1_000_000_000_000;
    const nextToken = generateTotp(secret, { now: t0 + 30_000 });
    expect(verifyTotp(secret, nextToken, { window: 1, now: t0 })).toBe(true);
  });

  it('rejects a token outside the window', () => {
    const secret = generateTotpSecret();
    const t0 = 1_000_000_000_000;
    const oldToken = generateTotp(secret, { now: t0 - 60_000 }); // 2 steps back
    expect(verifyTotp(secret, oldToken, { window: 1, now: t0 })).toBe(false);
  });

  it('rejects a token of wrong length', () => {
    const secret = generateTotpSecret();
    expect(verifyTotp(secret, '12345', { now: Date.now() })).toBe(false);
    expect(verifyTotp(secret, '1234567', { now: Date.now() })).toBe(false);
  });

  it('rejects a non-string token', () => {
    const secret = generateTotpSecret();
    expect(verifyTotp(secret, null, { now: Date.now() })).toBe(false);
    expect(verifyTotp(secret, 123456, { now: Date.now() })).toBe(false);
  });
});

// ── getTotpUri ────────────────────────────────────────────────────────────────

describe('getTotpUri', () => {
  it('returns an otpauth:// URI', () => {
    const uri = getTotpUri('JBSWY3DPEHPK3PXP', 'user@example.com');
    expect(uri.startsWith('otpauth://totp/')).toBe(true);
  });

  it('includes the secret in the URI', () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    const uri = getTotpUri(secret, 'user@example.com');
    expect(uri).toContain(`secret=${secret}`);
  });

  it('uses "Wander" as the default issuer', () => {
    const uri = getTotpUri('JBSWY3DPEHPK3PXP', 'user@example.com');
    expect(uri).toContain('issuer=Wander');
  });

  it('uses a custom issuer when supplied', () => {
    const uri = getTotpUri('JBSWY3DPEHPK3PXP', 'user@example.com', 'MyApp');
    expect(uri).toContain('issuer=MyApp');
  });

  it('includes the account name in the label', () => {
    const uri = getTotpUri('JBSWY3DPEHPK3PXP', 'alice@example.com');
    expect(uri).toContain('alice%40example.com');
  });
});

// ── setupTwoFactor ────────────────────────────────────────────────────────────

describe('setupTwoFactor', () => {
  it('returns a secret and a URI for an existing user', () => {
    createUser('u1', { email: 'alice@example.com' });
    const result = setupTwoFactor('u1');
    expect(typeof result.secret).toBe('string');
    expect(result.secret.length).toBeGreaterThan(0);
    expect(result.uri.startsWith('otpauth://')).toBe(true);
  });

  it('does not immediately enable 2FA on the user record', () => {
    createUser('u1', { email: 'alice@example.com' });
    setupTwoFactor('u1');
    // User has not verified yet — 2FA must still be disabled.
    const user = getUser('u1');
    expect(user.twoFactorEnabled).toBe(false);
    expect(user.twoFactorSecret).toBeNull();
  });

  it('throws for an unknown user', () => {
    expect(() => setupTwoFactor('no-such-user')).toThrow(/not found/);
  });
});

// ── enableTwoFactor ───────────────────────────────────────────────────────────

describe('enableTwoFactor', () => {
  it('enables 2FA when the token is valid', () => {
    createUser('u1', { email: 'alice@example.com' });
    const { secret } = setupTwoFactor('u1');
    const now = Date.now();
    const token = generateTotp(secret, { now });
    const updated = enableTwoFactor('u1', secret, token, { now });
    expect(updated.twoFactorEnabled).toBe(true);
    expect(updated.twoFactorSecret).toBe(secret);
  });

  it('persists the secret on the user record', () => {
    createUser('u1', { email: 'alice@example.com' });
    const { secret } = setupTwoFactor('u1');
    const now = Date.now();
    const token = generateTotp(secret, { now });
    enableTwoFactor('u1', secret, token, { now });
    const user = getUser('u1');
    expect(user.twoFactorEnabled).toBe(true);
    expect(user.twoFactorSecret).toBe(secret);
  });

  it('throws when the token is wrong', () => {
    createUser('u1', { email: 'alice@example.com' });
    const { secret } = setupTwoFactor('u1');
    expect(() => enableTwoFactor('u1', secret, '000000', { now: Date.now() })).toThrow(
      /invalid or expired/,
    );
  });

  it('throws for an unknown user', () => {
    const secret = generateTotpSecret();
    expect(() => enableTwoFactor('no-such-user', secret, '000000')).toThrow(/not found/);
  });
});

// ── disableTwoFactor ──────────────────────────────────────────────────────────

describe('disableTwoFactor', () => {
  function enableFor(userId) {
    const { secret } = setupTwoFactor(userId);
    const now = Date.now();
    const token = generateTotp(secret, { now });
    enableTwoFactor(userId, secret, token, { now });
  }

  it('disables 2FA and clears the secret', () => {
    createUser('u1', { email: 'alice@example.com' });
    enableFor('u1');

    const updated = disableTwoFactor('u1');
    expect(updated.twoFactorEnabled).toBe(false);
    expect(updated.twoFactorSecret).toBeNull();
  });

  it('makes the user record reflect disabled state after the call', () => {
    createUser('u1', { email: 'alice@example.com' });
    enableFor('u1');
    disableTwoFactor('u1');
    const user = getUser('u1');
    expect(user.twoFactorEnabled).toBe(false);
    expect(user.twoFactorSecret).toBeNull();
  });

  it('throws if 2FA is not enabled', () => {
    createUser('u1');
    expect(() => disableTwoFactor('u1')).toThrow(/does not have 2FA enabled/);
  });

  it('throws for an unknown user', () => {
    expect(() => disableTwoFactor('no-such-user')).toThrow(/not found/);
  });
});
