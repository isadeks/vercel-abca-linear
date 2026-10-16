import { describe, it, expect, beforeEach } from 'vitest';
import { createUser, deleteUser, _resetStore } from '../api/_lib/account.js';
import { updateProfile } from '../api/_lib/profile.js';
import handler from '../api/account/profile.js';

// Reset the in-memory store before every test so tests are fully isolated.
beforeEach(() => {
  _resetStore();
});

// ── updateProfile — field changes ─────────────────────────────────────────────

describe('updateProfile — field changes', () => {
  it('updates displayName only', () => {
    createUser('u1', { displayName: 'Alice', email: 'alice@example.com' });
    const result = updateProfile('u1', { displayName: 'Alicia' });
    expect(result.displayName).toBe('Alicia');
    expect(result.email).toBe('alice@example.com'); // unchanged
  });

  it('updates email only', () => {
    createUser('u1', { displayName: 'Alice', email: 'alice@example.com' });
    const result = updateProfile('u1', { email: 'new@example.com' });
    expect(result.email).toBe('new@example.com');
    expect(result.displayName).toBe('Alice'); // unchanged
  });

  it('updates avatarUrl only', () => {
    createUser('u1', { displayName: 'Alice', email: 'alice@example.com' });
    const result = updateProfile('u1', { avatarUrl: 'https://example.com/pic.jpg' });
    expect(result.avatarUrl).toBe('https://example.com/pic.jpg');
  });

  it('updates all three fields at once', () => {
    createUser('u1');
    const result = updateProfile('u1', {
      displayName: 'Bob',
      email: 'bob@example.com',
      avatarUrl: 'https://example.com/bob.png',
    });
    expect(result.displayName).toBe('Bob');
    expect(result.email).toBe('bob@example.com');
    expect(result.avatarUrl).toBe('https://example.com/bob.png');
  });

  it('clears avatarUrl when an empty string is provided', () => {
    createUser('u1', { avatarUrl: 'https://example.com/old.jpg' });
    const result = updateProfile('u1', { avatarUrl: '' });
    expect(result.avatarUrl).toBe('');
  });

  it('returns the five expected profile fields', () => {
    createUser('u1', { displayName: 'Alice', email: 'alice@example.com' });
    const result = updateProfile('u1', { displayName: 'Alice' });
    expect(Object.keys(result).sort()).toEqual(
      ['avatarUrl', 'displayName', 'email', 'updatedAt', 'userId'].sort(),
    );
  });

  it('does not expose sensitive fields (passwordHash, twoFactorSecret…)', () => {
    createUser('u1', { passwordHash: '$argon2id$test', email: 'a@b.com' });
    const result = updateProfile('u1', { displayName: 'Alice' });
    expect(result).not.toHaveProperty('passwordHash');
    expect(result).not.toHaveProperty('twoFactorSecret');
    expect(result).not.toHaveProperty('twoFactorEnabled');
    expect(result).not.toHaveProperty('notifyEmail');
  });

  it('sets a fresh updatedAt timestamp', () => {
    createUser('u1', { displayName: 'Alice', email: 'alice@example.com' });
    const before = new Date(Date.now() - 1).toISOString();
    const result = updateProfile('u1', { displayName: 'Alicia' });
    expect(result.updatedAt >= before).toBe(true);
  });

  it('normalises email to lowercase', () => {
    createUser('u1');
    const result = updateProfile('u1', { email: 'Hello@EXAMPLE.COM' });
    expect(result.email).toBe('hello@example.com');
  });

  it('trims whitespace from displayName', () => {
    createUser('u1');
    const result = updateProfile('u1', { displayName: '  Bob  ' });
    expect(result.displayName).toBe('Bob');
  });
});

// ── updateProfile — validation ────────────────────────────────────────────────

describe('updateProfile — validation', () => {
  it('throws when no profile fields are provided', () => {
    createUser('u1');
    expect(() => updateProfile('u1', {})).toThrow(/at least one/);
  });

  it('throws when displayName is blank', () => {
    createUser('u1');
    expect(() => updateProfile('u1', { displayName: '   ' })).toThrow(/blank/);
  });

  it('throws when displayName exceeds 100 characters', () => {
    createUser('u1');
    expect(() => updateProfile('u1', { displayName: 'a'.repeat(101) })).toThrow(/100/);
  });

  it('throws when displayName is not a string', () => {
    createUser('u1');
    expect(() => updateProfile('u1', { displayName: 42 })).toThrow(/string/);
  });

  it('throws when email is not a valid format', () => {
    createUser('u1');
    expect(() => updateProfile('u1', { email: 'not-an-email' })).toThrow(/valid email/);
  });

  it('throws when email is blank', () => {
    createUser('u1');
    expect(() => updateProfile('u1', { email: '' })).toThrow(/blank/);
  });

  it('throws when email exceeds 254 characters', () => {
    createUser('u1');
    const longEmail = 'a'.repeat(249) + '@b.com'; // 255 chars
    expect(() => updateProfile('u1', { email: longEmail })).toThrow(/254/);
  });

  it('throws when avatarUrl is not a string', () => {
    createUser('u1');
    expect(() => updateProfile('u1', { avatarUrl: 123 })).toThrow(/string/);
  });

  it('throws when avatarUrl does not start with http/https', () => {
    createUser('u1');
    expect(() => updateProfile('u1', { avatarUrl: 'ftp://example.com/img.jpg' }))
      .toThrow(/https?/);
  });

  it('accepts http:// URLs for avatarUrl', () => {
    createUser('u1');
    const result = updateProfile('u1', { avatarUrl: 'http://example.com/img.jpg' });
    expect(result.avatarUrl).toBe('http://example.com/img.jpg');
  });

  it('throws when avatarUrl exceeds 2048 characters', () => {
    createUser('u1');
    const longUrl = 'https://example.com/' + 'a'.repeat(2030);
    expect(() => updateProfile('u1', { avatarUrl: longUrl })).toThrow(/2048/);
  });

  it('throws when the user does not exist', () => {
    expect(() => updateProfile('nonexistent', { displayName: 'Ghost' }))
      .toThrow(/not found/);
  });

  it('throws when the user is soft-deleted', () => {
    createUser('u1', { displayName: 'Alice', email: 'alice@example.com' });
    deleteUser('u1');
    expect(() => updateProfile('u1', { displayName: 'Ghost' })).toThrow(/deleted/);
  });
});

// ── Route handler — PATCH /api/account/profile (smoke tests) ─────────────────

/**
 * Minimal mock of a Vercel request / response pair.
 */
function makeReqRes(method, body) {
  const req = { method, body: body ?? {} };
  const res = {
    _status: null,
    _json: null,
    _headers: {},
    status(code) { this._status = code; return this; },
    json(data)   { this._json  = data; return this; },
    setHeader(k, v) { this._headers[k] = v; return this; },
  };
  return { req, res };
}

describe('PATCH /api/account/profile — route smoke tests', () => {
  it('returns 405 for non-PATCH methods', () => {
    const { req, res } = makeReqRes('GET', {});
    handler(req, res);
    expect(res._status).toBe(405);
    expect(res._json.error).toMatch(/Method Not Allowed/i);
    expect(res._headers['Allow']).toBe('PATCH');
  });

  it('returns 400 when userId is missing', () => {
    const { req, res } = makeReqRes('PATCH', { displayName: 'Alice' });
    handler(req, res);
    expect(res._status).toBe(400);
    expect(res._json.error).toMatch(/userId/);
  });

  it('returns 400 when the user does not exist', () => {
    const { req, res } = makeReqRes('PATCH', { userId: 'nobody', displayName: 'Ghost' });
    handler(req, res);
    expect(res._status).toBe(400);
    expect(res._json.error).toMatch(/not found/);
  });

  it('returns 200 with the updated profile on success', () => {
    createUser('u1', { displayName: 'Alice', email: 'alice@example.com' });
    const { req, res } = makeReqRes('PATCH', {
      userId: 'u1',
      displayName: 'Alicia',
      email: 'alicia@example.com',
    });
    handler(req, res);
    expect(res._status).toBe(200);
    expect(res._json.displayName).toBe('Alicia');
    expect(res._json.email).toBe('alicia@example.com');
    expect(res._json.userId).toBe('u1');
    expect(res._json).not.toHaveProperty('passwordHash');
  });

  it('returns 400 for validation failure (blank displayName)', () => {
    createUser('u1', { displayName: 'Alice', email: 'alice@example.com' });
    const { req, res } = makeReqRes('PATCH', { userId: 'u1', displayName: '' });
    handler(req, res);
    expect(res._status).toBe(400);
    expect(res._json.error).toBeTruthy();
  });

  it('handles a missing req.body gracefully (returns 400 for missing userId)', () => {
    const req = { method: 'PATCH', body: undefined };
    const res = {
      _status: null, _json: null, _headers: {},
      status(c) { this._status = c; return this; },
      json(d)   { this._json  = d; return this; },
      setHeader(k, v) { this._headers[k] = v; return this; },
    };
    handler(req, res);
    expect(res._status).toBe(400);
    expect(res._json.error).toMatch(/userId/);
  });
});
