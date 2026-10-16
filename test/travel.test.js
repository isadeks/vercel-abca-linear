/**
 * Integration tests for the Travel API routes.
 *
 * Tests cover:
 *   - GET    /api/travel       (list own records)
 *   - POST   /api/travel       (create booking)
 *   - GET    /api/travel/:id   (view record — owner or admin)
 *   - DELETE /api/travel/:id   (cancel record — owner only)
 *
 * Routes are exercised directly (no HTTP server needed).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { signToken } from '../api/_lib/auth.js';
import { _resetForTests as resetUsers } from '../api/_lib/users.js';
import { _resetForTests as resetCountries, listCountries } from '../api/_lib/countries.js';
import { _resetForTests as resetTravel } from '../api/_lib/travel.js';
import travelIndexHandler from '../api/travel/index.js';
import travelIdHandler from '../api/travel/[id].js';

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeReq({ method = 'GET', token = null, body = null, query = {} } = {}) {
  return {
    method,
    headers: { authorization: token ? `Bearer ${token}` : '' },
    body,
    query,
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

async function adminToken(id = '1') {
  return signToken({ id, email: 'admin@wander.test', role: 'admin' });
}

async function userToken(id = '2') {
  return signToken({ id, email: 'user@wander.test', role: 'user' });
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe('GET /api/travel', () => {
  beforeEach(() => { resetUsers(); resetCountries(); resetTravel(); });

  it('returns empty list for user with no bookings', async () => {
    const res = makeRes();
    await travelIndexHandler(makeReq({ token: await userToken() }), res);
    expect(res._status).toBe(200);
    expect(res._body.records).toEqual([]);
  });

  it('rejects unauthenticated requests with 401', async () => {
    const res = makeRes();
    await travelIndexHandler(makeReq(), res);
    expect(res._status).toBe(401);
  });
});

describe('POST /api/travel', () => {
  beforeEach(() => { resetUsers(); resetCountries(); resetTravel(); });

  it('creates a travel booking for authenticated user', async () => {
    const countries = listCountries();
    const countryId = countries[0].id;
    const res = makeRes();
    await travelIndexHandler(
      makeReq({ method: 'POST', token: await userToken(), body: { countryId } }),
      res,
    );
    expect(res._status).toBe(201);
    expect(res._body.record.countryId).toBe(countryId);
    expect(res._body.record.status).toBe('active');
    expect(res._body.record.userId).toBe('2');
  });

  it('creates a travel booking for authenticated admin', async () => {
    const countries = listCountries();
    const countryId = countries[1].id;
    const res = makeRes();
    await travelIndexHandler(
      makeReq({ method: 'POST', token: await adminToken(), body: { countryId } }),
      res,
    );
    expect(res._status).toBe(201);
    expect(res._body.record.userId).toBe('1');
  });

  it('returns only the calling user\'s records after booking', async () => {
    const countries = listCountries();
    const countryId = countries[0].id;

    // User creates a booking
    await travelIndexHandler(
      makeReq({ method: 'POST', token: await userToken(), body: { countryId } }),
      makeRes(),
    );
    // Admin creates a separate booking
    await travelIndexHandler(
      makeReq({ method: 'POST', token: await adminToken(), body: { countryId } }),
      makeRes(),
    );

    const res = makeRes();
    await travelIndexHandler(makeReq({ token: await userToken() }), res);
    expect(res._status).toBe(200);
    expect(res._body.records).toHaveLength(1);
    expect(res._body.records[0].userId).toBe('2');
  });

  it('rejects booking with unknown countryId with 404', async () => {
    const res = makeRes();
    await travelIndexHandler(
      makeReq({ method: 'POST', token: await userToken(), body: { countryId: '999' } }),
      res,
    );
    expect(res._status).toBe(404);
    expect(res._body.error).toMatch(/Country not found/i);
  });

  it('rejects booking with missing countryId with 400', async () => {
    const res = makeRes();
    await travelIndexHandler(
      makeReq({ method: 'POST', token: await userToken(), body: {} }),
      res,
    );
    expect(res._status).toBe(400);
    expect(res._body.error).toMatch(/countryId is required/i);
  });

  it('rejects unauthenticated requests with 401', async () => {
    const countries = listCountries();
    const res = makeRes();
    await travelIndexHandler(
      makeReq({ method: 'POST', body: { countryId: countries[0].id } }),
      res,
    );
    expect(res._status).toBe(401);
  });
});

describe('GET /api/travel/:id', () => {
  beforeEach(() => { resetUsers(); resetCountries(); resetTravel(); });

  it('owner can view their own record', async () => {
    const countries = listCountries();
    const countryId = countries[0].id;

    // Create booking
    const createRes = makeRes();
    await travelIndexHandler(
      makeReq({ method: 'POST', token: await userToken(), body: { countryId } }),
      createRes,
    );
    const recordId = createRes._body.record.id;

    const res = makeRes();
    await travelIdHandler(
      makeReq({ token: await userToken(), query: { id: recordId } }),
      res,
    );
    expect(res._status).toBe(200);
    expect(res._body.record.id).toBe(recordId);
  });

  it('admin can view any record', async () => {
    const countries = listCountries();
    const countryId = countries[0].id;

    const createRes = makeRes();
    await travelIndexHandler(
      makeReq({ method: 'POST', token: await userToken(), body: { countryId } }),
      createRes,
    );
    const recordId = createRes._body.record.id;

    const res = makeRes();
    await travelIdHandler(
      makeReq({ token: await adminToken(), query: { id: recordId } }),
      res,
    );
    expect(res._status).toBe(200);
    expect(res._body.record.id).toBe(recordId);
  });

  it('another user cannot view someone else\'s record (403)', async () => {
    const countries = listCountries();
    const countryId = countries[0].id;

    // User 2 creates a booking
    const createRes = makeRes();
    await travelIndexHandler(
      makeReq({ method: 'POST', token: await userToken('2'), body: { countryId } }),
      createRes,
    );
    const recordId = createRes._body.record.id;

    // User 3 tries to view it
    const otherUserToken = await signToken({ id: '3', email: 'other@wander.test', role: 'user' });
    const res = makeRes();
    await travelIdHandler(
      makeReq({ token: otherUserToken, query: { id: recordId } }),
      res,
    );
    expect(res._status).toBe(403);
  });

  it('returns 404 for non-existent record', async () => {
    const res = makeRes();
    await travelIdHandler(
      makeReq({ token: await userToken(), query: { id: '999' } }),
      res,
    );
    expect(res._status).toBe(404);
  });

  it('rejects unauthenticated requests with 401', async () => {
    const res = makeRes();
    await travelIdHandler(makeReq({ query: { id: '1' } }), res);
    expect(res._status).toBe(401);
  });
});

describe('DELETE /api/travel/:id', () => {
  beforeEach(() => { resetUsers(); resetCountries(); resetTravel(); });

  it('owner can cancel their own record', async () => {
    const countries = listCountries();
    const countryId = countries[0].id;

    const createRes = makeRes();
    await travelIndexHandler(
      makeReq({ method: 'POST', token: await userToken(), body: { countryId } }),
      createRes,
    );
    const recordId = createRes._body.record.id;

    const res = makeRes();
    await travelIdHandler(
      makeReq({ method: 'DELETE', token: await userToken(), query: { id: recordId } }),
      res,
    );
    expect(res._status).toBe(200);
    expect(res._body.record.status).toBe('cancelled');
  });

  it('returns 400 when cancelling an already-cancelled record', async () => {
    const countries = listCountries();
    const countryId = countries[0].id;
    const token = await userToken();

    const createRes = makeRes();
    await travelIndexHandler(
      makeReq({ method: 'POST', token, body: { countryId } }),
      createRes,
    );
    const recordId = createRes._body.record.id;

    // First cancel
    await travelIdHandler(
      makeReq({ method: 'DELETE', token, query: { id: recordId } }),
      makeRes(),
    );

    // Second cancel
    const res = makeRes();
    await travelIdHandler(
      makeReq({ method: 'DELETE', token, query: { id: recordId } }),
      res,
    );
    expect(res._status).toBe(400);
    expect(res._body.error).toMatch(/already cancelled/i);
  });

  it('admin cannot cancel another user\'s record (403)', async () => {
    const countries = listCountries();
    const countryId = countries[0].id;

    const createRes = makeRes();
    await travelIndexHandler(
      makeReq({ method: 'POST', token: await userToken(), body: { countryId } }),
      createRes,
    );
    const recordId = createRes._body.record.id;

    const res = makeRes();
    await travelIdHandler(
      makeReq({ method: 'DELETE', token: await adminToken(), query: { id: recordId } }),
      res,
    );
    expect(res._status).toBe(403);
    expect(res._body.error).toMatch(/only the owner/i);
  });

  it('returns 404 for non-existent record', async () => {
    const res = makeRes();
    await travelIdHandler(
      makeReq({ method: 'DELETE', token: await userToken(), query: { id: '999' } }),
      res,
    );
    expect(res._status).toBe(404);
  });

  it('rejects unauthenticated requests with 401', async () => {
    const res = makeRes();
    await travelIdHandler(makeReq({ method: 'DELETE', query: { id: '1' } }), res);
    expect(res._status).toBe(401);
  });
});

describe('requireUser guard', () => {
  beforeEach(() => { resetUsers(); resetCountries(); resetTravel(); });

  it('allows admin role on user-guarded routes', async () => {
    // GET /api/travel — guarded by requireUser — admin should pass
    const res = makeRes();
    await travelIndexHandler(makeReq({ token: await adminToken() }), res);
    expect(res._status).toBe(200);
  });

  it('rejects unknown token on user-guarded routes with 401', async () => {
    const res = makeRes();
    await travelIndexHandler(makeReq({ token: 'invalid.token.here' }), res);
    expect(res._status).toBe(401);
  });
});
