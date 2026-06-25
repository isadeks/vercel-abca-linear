import { describe, it, expect, beforeEach } from 'vitest';
import { requireAuth, handleCors } from '../api/_lib/middleware.js';
import { createAccessToken, _resetRefreshTokenStore } from '../api/_lib/session.js';

const mockUser = { id: 'usr-99', email: 'mid@example.com' };

beforeEach(() => _resetRefreshTokenStore());

// ---------------------------------------------------------------------------
// Helpers to build lightweight req/res mocks
// ---------------------------------------------------------------------------

function makeRes() {
  const res = {
    _status: null,
    _body: null,
    _headers: {},
    status(code) { this._status = code; return this; },
    json(body) { this._body = body; return this; },
    setHeader(k, v) { this._headers[k] = v; return this; },
    end() { return this; },
  };
  return res;
}

// ---------------------------------------------------------------------------
// requireAuth
// ---------------------------------------------------------------------------

describe('requireAuth', () => {
  it('returns payload for a valid Bearer token', async () => {
    const token = await createAccessToken(mockUser);
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = makeRes();
    const payload = await requireAuth(req, res);
    expect(payload).not.toBeNull();
    expect(payload.sub).toBe(mockUser.id);
    expect(payload.email).toBe(mockUser.email);
  });

  it('sends 401 when Authorization header is missing', async () => {
    const req = { headers: {} };
    const res = makeRes();
    const result = await requireAuth(req, res);
    expect(result).toBeNull();
    expect(res._status).toBe(401);
  });

  it('sends 401 for an invalid token', async () => {
    const req = { headers: { authorization: 'Bearer invalid.token.here' } };
    const res = makeRes();
    const result = await requireAuth(req, res);
    expect(result).toBeNull();
    expect(res._status).toBe(401);
  });

  it('sends 401 for a tampered token', async () => {
    const token = await createAccessToken(mockUser);
    const tampered = token.slice(0, -8) + 'XXXXXXXX';
    const req = { headers: { authorization: `Bearer ${tampered}` } };
    const res = makeRes();
    const result = await requireAuth(req, res);
    expect(result).toBeNull();
    expect(res._status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// handleCors
// ---------------------------------------------------------------------------

describe('handleCors', () => {
  it('returns false and sets headers for allowed origin', () => {
    const req = { method: 'GET', headers: { origin: 'https://example.com' } };
    const res = makeRes();
    const preflight = handleCors(req, res, { allowedOrigins: ['https://example.com'] });
    expect(preflight).toBe(false);
    expect(res._headers['Access-Control-Allow-Origin']).toBe('https://example.com');
  });

  it('returns true and responds 204 for OPTIONS preflight', () => {
    const req = { method: 'OPTIONS', headers: { origin: 'https://example.com' } };
    const res = makeRes();
    const preflight = handleCors(req, res, { allowedOrigins: ['https://example.com'] });
    expect(preflight).toBe(true);
    expect(res._status).toBe(204);
  });

  it('does not set headers for disallowed origin', () => {
    const req = { method: 'GET', headers: { origin: 'https://evil.com' } };
    const res = makeRes();
    handleCors(req, res, { allowedOrigins: ['https://example.com'] });
    expect(res._headers['Access-Control-Allow-Origin']).toBeUndefined();
  });

  it('allows all origins when no allowedOrigins specified', () => {
    const req = { method: 'GET', headers: { origin: 'https://any.com' } };
    const res = makeRes();
    handleCors(req, res);
    expect(res._headers['Access-Control-Allow-Origin']).toBe('https://any.com');
  });
});
