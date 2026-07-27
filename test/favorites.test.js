// Tests for the favorites feature: the domain module (api/_lib/favorites.js)
// and the serverless endpoint (api/favorites.js). The endpoint tests drive the
// handler with lightweight mock (req, res) objects — no HTTP server required —
// and sign in through the real auth endpoints so the session/account wiring is
// exercised end to end.
import { describe, it, expect, beforeEach } from 'vitest';
import { resetStore } from '../api/_lib/store.js';
import { SESSION_COOKIE } from '../api/_lib/http.js';
import {
  normalizeFavorite,
  listFavorites,
  isFavorite,
  addFavorite,
  removeFavorite,
} from '../api/_lib/favorites.js';
import signup from '../api/signup.js';
import favorites from '../api/favorites.js';

// ── Domain module ───────────────────────────────────────────────────────────
describe('favorites domain module', () => {
  beforeEach(() => {
    resetStore();
  });

  it('normalizeFavorite keeps valid fields and drops extras', () => {
    const rec = normalizeFavorite({
      id: 'dest-kyoto',
      type: 'destination',
      title: 'Kyoto',
      url: 'kyoto-guide.html',
      region: 'Japan',
      hacker: 'ignored',
    });
    expect(rec).toEqual({
      id: 'dest-kyoto',
      type: 'destination',
      title: 'Kyoto',
      url: 'kyoto-guide.html',
      region: 'Japan',
    });
    expect(rec.hacker).toBeUndefined();
  });

  it('normalizeFavorite rejects a missing id', () => {
    expect(() => normalizeFavorite({ type: 'guide', title: 'X' })).toThrow(/id is required/);
  });

  it('normalizeFavorite rejects an unknown type', () => {
    expect(() => normalizeFavorite({ id: 'x', type: 'hotel', title: 'X' })).toThrow();
  });

  it('normalizeFavorite rejects a missing title', () => {
    expect(() => normalizeFavorite({ id: 'x', type: 'guide' })).toThrow(/title is required/);
  });

  it('listFavorites returns [] for an unknown user', async () => {
    expect(await listFavorites('nobody')).toEqual([]);
  });

  it('addFavorite persists a favorite with a server-set addedAt', async () => {
    const list = await addFavorite('u1', { id: 'dest-kyoto', type: 'destination', title: 'Kyoto' });
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('dest-kyoto');
    expect(typeof list[0].addedAt).toBe('string');
    expect(await isFavorite('u1', 'dest-kyoto')).toBe(true);
  });

  it('addFavorite is idempotent — no duplicates', async () => {
    await addFavorite('u1', { id: 'dest-kyoto', type: 'destination', title: 'Kyoto' });
    const list = await addFavorite('u1', { id: 'dest-kyoto', type: 'destination', title: 'Kyoto' });
    expect(list).toHaveLength(1);
  });

  it('favorites are scoped per user', async () => {
    await addFavorite('u1', { id: 'dest-kyoto', type: 'destination', title: 'Kyoto' });
    expect(await listFavorites('u2')).toEqual([]);
    expect(await isFavorite('u2', 'dest-kyoto')).toBe(false);
  });

  it('removeFavorite removes by id and is a no-op when absent', async () => {
    await addFavorite('u1', { id: 'a', type: 'guide', title: 'A' });
    await addFavorite('u1', { id: 'b', type: 'guide', title: 'B' });
    const afterRemove = await removeFavorite('u1', 'a');
    expect(afterRemove.map((f) => f.id)).toEqual(['b']);
    // Removing something not present leaves the list unchanged.
    const again = await removeFavorite('u1', 'a');
    expect(again.map((f) => f.id)).toEqual(['b']);
  });
});

// ── Serverless endpoint ───────────────────────────────────────────────────────
function mockReq({ method = 'GET', body = {}, cookies = '', url = '/api/favorites' } = {}) {
  return { method, body, url, headers: cookies ? { cookie: cookies } : {} };
}

function mockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: undefined,
    setHeader(k, v) { this.headers[k] = v; },
    end(payload) { this.body = payload ? JSON.parse(payload) : undefined; },
  };
}

function cookieToken(res) {
  const sc = res.headers['Set-Cookie'] || '';
  const m = sc.match(new RegExp(`${SESSION_COOKIE}=([^;]*)`));
  return m ? m[1] : null;
}

// Sign up a fresh account and return its session cookie string.
async function signInCookie(email = 'fan@wander.com') {
  const res = mockRes();
  await signup(mockReq({ method: 'POST', body: { email, password: 'password123' } }), res);
  return `${SESSION_COOKIE}=${cookieToken(res)}`;
}

describe('favorites endpoint', () => {
  beforeEach(() => {
    resetStore();
  });

  it('requires sign-in — anonymous GET returns 401 with an AUTH_REQUIRED code', async () => {
    const res = mockRes();
    await favorites(mockReq({ method: 'GET' }), res);
    expect(res.statusCode).toBe(401);
    expect(res.body.code).toBe('AUTH_REQUIRED');
  });

  it('anonymous POST also returns 401 (prompt to sign in, not a server error)', async () => {
    const res = mockRes();
    await favorites(mockReq({ method: 'POST', body: { id: 'x', type: 'guide', title: 'X' } }), res);
    expect(res.statusCode).toBe(401);
    expect(res.body.code).toBe('AUTH_REQUIRED');
  });

  it('a signed-in user starts with an empty list', async () => {
    const cookies = await signInCookie();
    const res = mockRes();
    await favorites(mockReq({ method: 'GET', cookies }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.favorites).toEqual([]);
  });

  it('POST saves a favorite and GET reads it back (persists on the account)', async () => {
    const cookies = await signInCookie();
    const postRes = mockRes();
    await favorites(mockReq({
      method: 'POST',
      cookies,
      body: { id: 'guide-amalfi', type: 'guide', title: 'Amalfi Coast', url: 'amalfi-guide.html', region: 'Southern Italy' },
    }), postRes);
    expect(postRes.statusCode).toBe(200);
    expect(postRes.body.favorites).toHaveLength(1);

    const getRes = mockRes();
    await favorites(mockReq({ method: 'GET', cookies }), getRes);
    expect(getRes.body.favorites[0]).toMatchObject({
      id: 'guide-amalfi',
      type: 'guide',
      title: 'Amalfi Coast',
    });
  });

  it('POST is idempotent — saving twice does not duplicate', async () => {
    const cookies = await signInCookie();
    const item = { id: 'dest-kyoto', type: 'destination', title: 'Kyoto' };
    await favorites(mockReq({ method: 'POST', cookies, body: item }), mockRes());
    const res = mockRes();
    await favorites(mockReq({ method: 'POST', cookies, body: item }), res);
    expect(res.body.favorites).toHaveLength(1);
  });

  it('POST with an invalid favorite returns 400', async () => {
    const cookies = await signInCookie();
    const res = mockRes();
    await favorites(mockReq({ method: 'POST', cookies, body: { type: 'guide' } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('DELETE removes a favorite by id from the query string', async () => {
    const cookies = await signInCookie();
    await favorites(mockReq({
      method: 'POST', cookies,
      body: { id: 'dest-kyoto', type: 'destination', title: 'Kyoto' },
    }), mockRes());

    const delRes = mockRes();
    await favorites(mockReq({
      method: 'DELETE', cookies, url: '/api/favorites?id=dest-kyoto',
    }), delRes);
    expect(delRes.statusCode).toBe(200);
    expect(delRes.body.favorites).toEqual([]);
  });

  it('DELETE also accepts the id in the request body', async () => {
    const cookies = await signInCookie();
    await favorites(mockReq({
      method: 'POST', cookies,
      body: { id: 'dest-kyoto', type: 'destination', title: 'Kyoto' },
    }), mockRes());

    const delRes = mockRes();
    await favorites(mockReq({ method: 'DELETE', cookies, body: { id: 'dest-kyoto' } }), delRes);
    expect(delRes.body.favorites).toEqual([]);
  });

  it('favorites are private to each account', async () => {
    const alice = await signInCookie('alice@wander.com');
    await favorites(mockReq({
      method: 'POST', cookies: alice,
      body: { id: 'dest-kyoto', type: 'destination', title: 'Kyoto' },
    }), mockRes());

    const bob = await signInCookie('bob@wander.com');
    const res = mockRes();
    await favorites(mockReq({ method: 'GET', cookies: bob }), res);
    expect(res.body.favorites).toEqual([]);
  });

  it('rejects unsupported HTTP methods with 405', async () => {
    const res = mockRes();
    await favorites(mockReq({ method: 'PUT' }), res);
    expect(res.statusCode).toBe(405);
    expect(res.headers.Allow).toContain('GET');
  });
});
