// Integration-style tests for the /api/quiz-results serverless function,
// driven with lightweight mock (req, res) objects — no HTTP server required.
import { describe, it, expect, beforeEach } from 'vitest';
import { resetStore } from '../api/_lib/store.js';
import { SESSION_COOKIE } from '../api/_lib/http.js';
import signup from '../api/signup.js';
import quizResults from '../api/quiz-results.js';

function mockReq({ method = 'GET', body = {}, cookies = '' } = {}) {
  return { method, body, headers: cookies ? { cookie: cookies } : {} };
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

// Register a fresh user and return their session cookie header.
async function signedInCookie(email = 'a@b.com') {
  const res = mockRes();
  await signup(mockReq({ method: 'POST', body: { email, password: 'password123' } }), res);
  return `${SESSION_COOKIE}=${cookieToken(res)}`;
}

const sampleResult = {
  destinationId: 'amalfi',
  destinationName: 'Amalfi Coast',
  destinationRegion: 'Southern Europe',
  destinationCountry: 'Italy',
  score: 42,
  answers: [0, 1, 2, 0, 1, 1, 2, 0],
};

describe('/api/quiz-results endpoint', () => {
  beforeEach(() => {
    resetStore();
  });

  it('saves a result for a signed-in visitor (201) and lists it back', async () => {
    const cookies = await signedInCookie();

    const saveRes = mockRes();
    await quizResults(mockReq({ method: 'POST', body: sampleResult, cookies }), saveRes);
    expect(saveRes.statusCode).toBe(201);
    expect(saveRes.body.result.destinationId).toBe('amalfi');
    expect(saveRes.body.result.id).toBeTruthy();

    const listRes = mockRes();
    await quizResults(mockReq({ method: 'GET', cookies }), listRes);
    expect(listRes.statusCode).toBe(200);
    expect(listRes.body.results).toHaveLength(1);
    expect(listRes.body.results[0].destinationName).toBe('Amalfi Coast');
    expect(listRes.body.results[0].score).toBe(42);
  });

  it('rejects saving for anonymous visitors with 401 (quiz still works, just not saved)', async () => {
    const res = mockRes();
    await quizResults(mockReq({ method: 'POST', body: sampleResult }), res);
    expect(res.statusCode).toBe(401);
    expect(res.body.result).toBeUndefined();
  });

  it('rejects listing for anonymous visitors with 401', async () => {
    const res = mockRes();
    await quizResults(mockReq({ method: 'GET' }), res);
    expect(res.statusCode).toBe(401);
    expect(res.body.results).toBeUndefined();
  });

  it('returns an empty list for a signed-in visitor with no saved results', async () => {
    const cookies = await signedInCookie();
    const res = mockRes();
    await quizResults(mockReq({ method: 'GET', cookies }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.results).toEqual([]);
  });

  it('validates the body and returns 400 on a bad result', async () => {
    const cookies = await signedInCookie();
    const res = mockRes();
    await quizResults(mockReq({ method: 'POST', body: { score: 1 }, cookies }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/destinationId/);
  });

  it('keeps each account\'s results separate', async () => {
    const alice = await signedInCookie('alice@b.com');
    const bob = await signedInCookie('bob@b.com');

    await quizResults(
      mockReq({ method: 'POST', body: { ...sampleResult, destinationId: 'kyoto' }, cookies: alice }),
      mockRes(),
    );

    const bobList = mockRes();
    await quizResults(mockReq({ method: 'GET', cookies: bob }), bobList);
    expect(bobList.body.results).toEqual([]);

    const aliceList = mockRes();
    await quizResults(mockReq({ method: 'GET', cookies: alice }), aliceList);
    expect(aliceList.body.results.map((r) => r.destinationId)).toEqual(['kyoto']);
  });

  it('rejects unsupported HTTP methods with 405', async () => {
    const cookies = await signedInCookie();
    const res = mockRes();
    await quizResults(mockReq({ method: 'DELETE', cookies }), res);
    expect(res.statusCode).toBe(405);
    expect(res.headers.Allow).toBe('GET, POST');
  });
});
