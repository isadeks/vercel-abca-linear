/**
 * Integration tests for the Countries API routes.
 *
 * Tests cover:
 *   - GET  /api/countries      (requireUser guard)
 *   - GET  /api/admin/countries (requireAdmin guard)
 *   - POST /api/admin/countries (requireAdmin guard)
 *
 * Routes are exercised directly (no HTTP server needed).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { signToken } from '../api/_lib/auth.js';
import { _resetForTests as resetUsers } from '../api/_lib/users.js';
import { _resetForTests as resetCountries } from '../api/_lib/countries.js';
import countriesHandler from '../api/countries/index.js';
import adminCountriesHandler from '../api/admin/countries/index.js';

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeReq({ method = 'GET', token = null, body = null } = {}) {
  return {
    method,
    headers: { authorization: token ? `Bearer ${token}` : '' },
    body,
    query: {},
  };
}

function makeRes() {
  const res = {
    _status: 200,
    _body: null,
    _headers: {},
    status(code) { this._status = code; return this; },
    json(body) { this._body = body; return this; },
    setHeader(k, v) { this._headers[k] = v; },
  };
  return res;
}

async function adminToken() {
  return signToken({ id: '1', email: 'admin@wander.test', role: 'admin' });
}

async function userToken() {
  return signToken({ id: '2', email: 'user@wander.test', role: 'user' });
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe('GET /api/countries', () => {
  beforeEach(() => { resetUsers(); resetCountries(); });

  it('returns countries for authenticated user', async () => {
    const res = makeRes();
    await countriesHandler(makeReq({ token: await userToken() }), res);
    expect(res._status).toBe(200);
    expect(Array.isArray(res._body.countries)).toBe(true);
    expect(res._body.countries.length).toBeGreaterThan(0);
  });

  it('returns countries for authenticated admin', async () => {
    const res = makeRes();
    await countriesHandler(makeReq({ token: await adminToken() }), res);
    expect(res._status).toBe(200);
    expect(Array.isArray(res._body.countries)).toBe(true);
  });

  it('rejects unauthenticated requests with 401', async () => {
    const res = makeRes();
    await countriesHandler(makeReq(), res);
    expect(res._status).toBe(401);
    expect(res._body.error).toMatch(/Unauthorized/i);
  });

  it('rejects non-GET methods with 405', async () => {
    const res = makeRes();
    await countriesHandler(makeReq({ method: 'POST', token: await userToken() }), res);
    expect(res._status).toBe(405);
  });
});

describe('GET /api/admin/countries', () => {
  beforeEach(() => { resetUsers(); resetCountries(); });

  it('returns countries for admin', async () => {
    const res = makeRes();
    await adminCountriesHandler(makeReq({ token: await adminToken() }), res);
    expect(res._status).toBe(200);
    expect(Array.isArray(res._body.countries)).toBe(true);
  });

  it('rejects regular users with 403', async () => {
    const res = makeRes();
    await adminCountriesHandler(makeReq({ token: await userToken() }), res);
    expect(res._status).toBe(403);
    expect(res._body.error).toMatch(/Forbidden/i);
  });

  it('rejects unauthenticated requests with 401', async () => {
    const res = makeRes();
    await adminCountriesHandler(makeReq(), res);
    expect(res._status).toBe(401);
  });
});

describe('POST /api/admin/countries', () => {
  beforeEach(() => { resetUsers(); resetCountries(); });

  it('creates a country as admin', async () => {
    const res = makeRes();
    await adminCountriesHandler(
      makeReq({ method: 'POST', token: await adminToken(), body: { name: 'Australia', description: 'Land down under' } }),
      res,
    );
    expect(res._status).toBe(201);
    expect(res._body.country.name).toBe('Australia');
    expect(res._body.country.id).toBeDefined();
  });

  it('rejects duplicate country name with 409', async () => {
    const token = await adminToken();
    const res1 = makeRes();
    await adminCountriesHandler(
      makeReq({ method: 'POST', token, body: { name: 'Iceland' } }),
      res1,
    );
    expect(res1._status).toBe(201);

    const res2 = makeRes();
    await adminCountriesHandler(
      makeReq({ method: 'POST', token, body: { name: 'Iceland' } }),
      res2,
    );
    expect(res2._status).toBe(409);
  });

  it('rejects missing name with 400', async () => {
    const res = makeRes();
    await adminCountriesHandler(
      makeReq({ method: 'POST', token: await adminToken(), body: {} }),
      res,
    );
    expect(res._status).toBe(400);
    expect(res._body.error).toMatch(/name is required/i);
  });

  it('rejects regular users with 403', async () => {
    const res = makeRes();
    await adminCountriesHandler(
      makeReq({ method: 'POST', token: await userToken(), body: { name: 'Peru' } }),
      res,
    );
    expect(res._status).toBe(403);
  });

  it('rejects unauthenticated requests with 401', async () => {
    const res = makeRes();
    await adminCountriesHandler(makeReq({ method: 'POST', body: { name: 'Peru' } }), res);
    expect(res._status).toBe(401);
  });
});
