import { describe, it, expect, beforeEach } from 'vitest';
import { issueTokens, rotateRefreshToken, revokeRefreshToken, authenticateRequest, _clearSessions } from '../../api/_lib/auth/sessions.js';
import { _clearUsers, createUser } from '../../api/_lib/auth/users.js';

const TEST_SECRET = 'sessions-test-secret-long-enough-!!';

beforeEach(() => {
  process.env.JWT_SECRET = TEST_SECRET;
  _clearSessions();
  _clearUsers();
});

describe('sessions', () => {
  const fakeUser = { id: 'u1', email: 'test@example.com', roles: ['user'] };

  it('issues access and refresh tokens', () => {
    const { accessToken, refreshToken, expiresIn } = issueTokens(fakeUser);
    expect(typeof accessToken).toBe('string');
    expect(typeof refreshToken).toBe('string');
    expect(expiresIn).toBe(900); // 15 min
  });

  it('rotates a refresh token', () => {
    createUser({ ...fakeUser, email: 'test@example.com' });
    // createUser generates its own id, so we need a real user
    const user = createUser({ email: 'rotate@example.com' });
    const { refreshToken } = issueTokens(user);
    const newTokens = rotateRefreshToken(refreshToken, (id) => {
      return id === user.id ? user : null;
    });
    expect(typeof newTokens.accessToken).toBe('string');
    expect(newTokens.refreshToken).not.toBe(refreshToken);
  });

  it('rejects reuse of a rotated refresh token', () => {
    const user = createUser({ email: 'rotate2@example.com' });
    const { refreshToken } = issueTokens(user);
    rotateRefreshToken(refreshToken, () => user);
    expect(() => rotateRefreshToken(refreshToken, () => user)).toThrow('not found or already used');
  });

  it('revokes a refresh token', () => {
    const { refreshToken } = issueTokens(fakeUser);
    revokeRefreshToken(refreshToken);
    expect(() => rotateRefreshToken(refreshToken, () => fakeUser)).toThrow('not found or already used');
  });

  it('authenticates a valid Bearer token', () => {
    const { accessToken } = issueTokens(fakeUser);
    const claims = authenticateRequest(`Bearer ${accessToken}`);
    expect(claims.sub).toBe('u1');
  });

  it('rejects a missing Authorization header', () => {
    expect(() => authenticateRequest(undefined)).toThrow('Missing Authorization header');
  });

  it('rejects a malformed Authorization header', () => {
    expect(() => authenticateRequest('Basic dXNlcjpwYXNz')).toThrow('"Bearer <token>"');
  });
});
