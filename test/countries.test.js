/**
 * Integration tests for the admin country-management endpoints.
 *
 * Tests use the handler functions directly (no HTTP server needed), following the
 * same mock-req/mock-res pattern established by authMiddleware.test.js.
 *
 * Coverage:
 *   - requireAdmin guard: 401 (no token), 403 (non-admin), 200/201 (admin)
 *   - Collection endpoint (GET list, POST create)
 *   - Single-resource endpoint (GET one, PUT update, DELETE)
 *   - 404 for unknown ids
 *   - 400 for invalid / conflicting data
 *   - 405 for wrong HTTP method
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { signToken } from '../api/_lib/auth.js';
import { _resetForTests as resetUsers } from '../api/_lib/users.js';
import { _resetForTests as resetCountries } from '../api/_lib/countries.js';
import collectionHandler from '../api/admin/countries/index.js';
import resourceHandler   from '../api/admin/countries/[id].js';
import countriesHandler  from '../api/countries/index.js';

// ─── Mock helpers ─────────────────────────────────────────────────────────────

function makeReq({ method = 'GET', token, body = {}, query = {} } = {}) {
  return {
    method,
    headers: { authorization: token ? `Bearer ${token}` : '' },
    body,
    query,
    user: null,
  };
}

function makeRes() {
  const res = {
    _status: null,
    _body:   null,
    _headers: {},
    status(code)        { this._status = code; return this; },
    json(body)          { this._body = body;   return this; },
    setHeader(k, v)     { this._headers[k] = v; return this; },
  };
  return res;
}

// ─── Token fixtures (created once per suite) ──────────────────────────────────

let adminToken;
let userToken;

// ─── Shared beforeEach ────────────────────────────────────────────────────────

beforeEach(async () => {
  resetUsers();
  resetCountries();
  adminToken = await signToken({ id: '1', email: 'admin@wander.test', role: 'admin' });
  userToken  = await signToken({ id: '2', email: 'user@wander.test',  role: 'user'  });
});

// ─── Auth guard tests (collection handler, representative) ────────────────────

describe('admin role guard', () => {
  it('returns 401 when no Authorization header is provided', async () => {
    const req = makeReq({ method: 'GET' }); // no token
    const res = makeRes();
    await collectionHandler(req, res);
    expect(res._status).toBe(401);
    expect(res._body.error).toMatch(/Unauthorized/i);
  });

  it('returns 401 for a malformed token', async () => {
    const req = makeReq({ method: 'GET', token: 'garbage.token.here' });
    const res = makeRes();
    await collectionHandler(req, res);
    expect(res._status).toBe(401);
  });

  it('returns 403 for a valid token with role=user', async () => {
    const req = makeReq({ method: 'GET', token: userToken });
    const res = makeRes();
    await collectionHandler(req, res);
    expect(res._status).toBe(403);
    expect(res._body.error).toMatch(/Forbidden/i);
  });

  it('allows a valid admin token through', async () => {
    const req = makeReq({ method: 'GET', token: adminToken });
    const res = makeRes();
    await collectionHandler(req, res);
    expect(res._status).toBe(200);
  });
});

// ─── Collection endpoint ──────────────────────────────────────────────────────

describe('GET /api/admin/countries (list)', () => {
  it('returns the seeded countries', async () => {
    const req = makeReq({ method: 'GET', token: adminToken });
    const res = makeRes();
    await collectionHandler(req, res);
    expect(res._status).toBe(200);
    expect(Array.isArray(res._body.countries)).toBe(true);
    expect(res._body.countries.length).toBeGreaterThan(0);
  });

  it('each country has id, name, code, capital, continent', async () => {
    const req = makeReq({ method: 'GET', token: adminToken });
    const res = makeRes();
    await collectionHandler(req, res);
    for (const c of res._body.countries) {
      expect(c.id).toBeDefined();
      expect(c.name).toBeDefined();
      expect(c.code).toBeDefined();
      expect(c.capital).toBeDefined();
      expect(c.continent).toBeDefined();
    }
  });
});

describe('POST /api/admin/countries (create)', () => {
  it('creates a new country and returns 201', async () => {
    const req = makeReq({
      method: 'POST',
      token:  adminToken,
      body:   { name: 'Germany', code: 'DE', capital: 'Berlin', continent: 'Europe' },
    });
    const res = makeRes();
    await collectionHandler(req, res);
    expect(res._status).toBe(201);
    expect(res._body.country.name).toBe('Germany');
    expect(res._body.country.code).toBe('DE');
    expect(res._body.country.id).toBeDefined();
  });

  it('normalises the country code to uppercase', async () => {
    const req = makeReq({
      method: 'POST',
      token:  adminToken,
      body:   { name: 'Australia', code: 'au' },
    });
    const res = makeRes();
    await collectionHandler(req, res);
    expect(res._status).toBe(201);
    expect(res._body.country.code).toBe('AU');
  });

  it('returns 400 when name is missing', async () => {
    const req = makeReq({ method: 'POST', token: adminToken, body: { code: 'XX' } });
    const res = makeRes();
    await collectionHandler(req, res);
    expect(res._status).toBe(400);
    expect(res._body.error).toMatch(/name/i);
  });

  it('returns 400 when code is missing', async () => {
    const req = makeReq({ method: 'POST', token: adminToken, body: { name: 'Nowhere' } });
    const res = makeRes();
    await collectionHandler(req, res);
    expect(res._status).toBe(400);
    expect(res._body.error).toMatch(/code/i);
  });

  it('returns 400 for a duplicate country code', async () => {
    // FR is seeded
    const req = makeReq({
      method: 'POST',
      token:  adminToken,
      body:   { name: 'French Republic', code: 'FR' },
    });
    const res = makeRes();
    await collectionHandler(req, res);
    expect(res._status).toBe(400);
    expect(res._body.error).toMatch(/already exists/i);
  });

  it('returns 403 for a non-admin attempting to create', async () => {
    const req = makeReq({
      method: 'POST',
      token:  userToken,
      body:   { name: 'Test', code: 'TT' },
    });
    const res = makeRes();
    await collectionHandler(req, res);
    expect(res._status).toBe(403);
  });

  it('returns 405 for unsupported method on collection', async () => {
    const req = makeReq({ method: 'DELETE', token: adminToken });
    const res = makeRes();
    await collectionHandler(req, res);
    expect(res._status).toBe(405);
  });
});

// ─── Single-resource endpoint ─────────────────────────────────────────────────

describe('GET /api/admin/countries/[id] (fetch one)', () => {
  it('returns a known country by id', async () => {
    // id "1" is seeded as France
    const req = makeReq({ method: 'GET', token: adminToken, query: { id: '1' } });
    const res = makeRes();
    await resourceHandler(req, res);
    expect(res._status).toBe(200);
    expect(res._body.country.id).toBe('1');
    expect(res._body.country.name).toBe('France');
  });

  it('returns 404 for an unknown id', async () => {
    const req = makeReq({ method: 'GET', token: adminToken, query: { id: '999' } });
    const res = makeRes();
    await resourceHandler(req, res);
    expect(res._status).toBe(404);
  });

  it('returns 403 for a non-admin', async () => {
    const req = makeReq({ method: 'GET', token: userToken, query: { id: '1' } });
    const res = makeRes();
    await resourceHandler(req, res);
    expect(res._status).toBe(403);
  });
});

describe('PUT /api/admin/countries/[id] (update)', () => {
  it('updates an existing country', async () => {
    const req = makeReq({
      method: 'PUT',
      token:  adminToken,
      query:  { id: '1' },
      body:   { capital: 'Lyon' }, // silly but valid for a unit test
    });
    const res = makeRes();
    await resourceHandler(req, res);
    expect(res._status).toBe(200);
    expect(res._body.country.capital).toBe('Lyon');
    expect(res._body.country.name).toBe('France'); // unchanged
  });

  it('normalises the updated code to uppercase', async () => {
    const req = makeReq({
      method: 'PUT',
      token:  adminToken,
      query:  { id: '1' },
      body:   { code: 'fr' },
    });
    const res = makeRes();
    await resourceHandler(req, res);
    expect(res._status).toBe(200);
    expect(res._body.country.code).toBe('FR');
  });

  it('returns 404 for an unknown id', async () => {
    const req = makeReq({
      method: 'PUT',
      token:  adminToken,
      query:  { id: '999' },
      body:   { name: 'Nowhere' },
    });
    const res = makeRes();
    await resourceHandler(req, res);
    expect(res._status).toBe(404);
  });

  it('returns 400 for a code already used by another country', async () => {
    // id "1" = France (FR), id "2" = Japan (JP)
    const req = makeReq({
      method: 'PUT',
      token:  adminToken,
      query:  { id: '1' },
      body:   { code: 'JP' }, // JP is Japan — conflict
    });
    const res = makeRes();
    await resourceHandler(req, res);
    expect(res._status).toBe(400);
    expect(res._body.error).toMatch(/already exists/i);
  });

  it('returns 403 for a non-admin', async () => {
    const req = makeReq({
      method: 'PUT',
      token:  userToken,
      query:  { id: '1' },
      body:   { name: 'Hack' },
    });
    const res = makeRes();
    await resourceHandler(req, res);
    expect(res._status).toBe(403);
  });
});

describe('DELETE /api/admin/countries/[id] (delete)', () => {
  it('deletes an existing country and returns 200', async () => {
    const req = makeReq({ method: 'DELETE', token: adminToken, query: { id: '1' } });
    const res = makeRes();
    await resourceHandler(req, res);
    expect(res._status).toBe(200);
    expect(res._body.message).toMatch(/1/);
  });

  it('country is no longer available after deletion', async () => {
    // Delete France (id 1)
    await resourceHandler(
      makeReq({ method: 'DELETE', token: adminToken, query: { id: '1' } }),
      makeRes(),
    );
    // Attempt to fetch it
    const req = makeReq({ method: 'GET', token: adminToken, query: { id: '1' } });
    const res = makeRes();
    await resourceHandler(req, res);
    expect(res._status).toBe(404);
  });

  it('returns 404 for an unknown id', async () => {
    const req = makeReq({ method: 'DELETE', token: adminToken, query: { id: '999' } });
    const res = makeRes();
    await resourceHandler(req, res);
    expect(res._status).toBe(404);
  });

  it('returns 403 for a non-admin', async () => {
    const req = makeReq({ method: 'DELETE', token: userToken, query: { id: '1' } });
    const res = makeRes();
    await resourceHandler(req, res);
    expect(res._status).toBe(403);
  });

  it('returns 405 for unsupported method on resource', async () => {
    const req = makeReq({ method: 'POST', token: adminToken, query: { id: '1' } });
    const res = makeRes();
    await resourceHandler(req, res);
    expect(res._status).toBe(405);
  });
});

// ─── User-facing countries endpoint ──────────────────────────────────────────

describe('GET /api/countries (user-accessible)', () => {
  beforeEach(() => {
    resetUsers();
    resetCountries();
  });

  it('returns countries for authenticated user', async () => {
    const token = await signToken({ id: '2', email: 'user@wander.test', role: 'user' });
    const req = makeReq({ method: 'GET', token });
    const res = makeRes();
    await countriesHandler(req, res);
    expect(res._status).toBe(200);
    expect(Array.isArray(res._body.countries)).toBe(true);
    expect(res._body.countries.length).toBeGreaterThan(0);
  });

  it('returns countries for authenticated admin', async () => {
    const req = makeReq({ method: 'GET', token: adminToken });
    const res = makeRes();
    await countriesHandler(req, res);
    expect(res._status).toBe(200);
    expect(Array.isArray(res._body.countries)).toBe(true);
  });

  it('rejects unauthenticated requests with 401', async () => {
    const req = makeReq({ method: 'GET' }); // no token
    const res = makeRes();
    await countriesHandler(req, res);
    expect(res._status).toBe(401);
    expect(res._body.error).toMatch(/Unauthorized/i);
  });

  it('rejects non-GET methods with 405', async () => {
    const token = await signToken({ id: '2', email: 'user@wander.test', role: 'user' });
    const req = makeReq({ method: 'POST', token });
    const res = makeRes();
    await countriesHandler(req, res);
    expect(res._status).toBe(405);
  });
});
