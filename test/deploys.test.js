import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import handler from '../api/deploys.js';

function makeRes() {
  const res = { _status: null, _body: null };
  res.status = (code) => { res._status = code; return res; };
  res.json   = (body)  => { res._body  = body; return res; };
  return res;
}

describe('GET /api/deploys — stub mode (no env vars)', () => {
  beforeEach(() => {
    delete process.env.VERCEL_TOKEN;
    delete process.env.VERCEL_PROJECT_ID;
    delete process.env.VERCEL_TEAM_ID;
  });

  it('returns 200 with stub:true when VERCEL_TOKEN is absent', async () => {
    const res = makeRes();
    await handler({}, res);
    expect(res._status).toBe(200);
    expect(res._body.stub).toBe(true);
  });

  it('returns stub:true when VERCEL_PROJECT_ID is absent but token is set', async () => {
    process.env.VERCEL_TOKEN = 'tok-test';
    const res = makeRes();
    await handler({}, res);
    expect(res._body.stub).toBe(true);
  });

  it('stub payload contains at least one deploy entry', async () => {
    const res = makeRes();
    await handler({}, res);
    expect(Array.isArray(res._body.deploys)).toBe(true);
    expect(res._body.deploys.length).toBeGreaterThan(0);
  });

  it('each stub deploy has required fields', async () => {
    const res = makeRes();
    await handler({}, res);
    for (const d of res._body.deploys) {
      expect(d).toHaveProperty('id');
      expect(d).toHaveProperty('url');
      expect(d).toHaveProperty('state');
      expect(d).toHaveProperty('createdAt');
      expect(d).toHaveProperty('branch');
      expect(d).toHaveProperty('commit');
      expect(d).toHaveProperty('commitMessage');
    }
  });
});

describe('GET /api/deploys — live mode (env vars set)', () => {
  const ORIGINAL_FETCH = globalThis.fetch;

  beforeEach(() => {
    process.env.VERCEL_TOKEN      = 'tok-test';
    process.env.VERCEL_PROJECT_ID = 'proj-test';
  });

  afterEach(() => {
    delete process.env.VERCEL_TOKEN;
    delete process.env.VERCEL_PROJECT_ID;
    delete process.env.VERCEL_TEAM_ID;
    globalThis.fetch = ORIGINAL_FETCH;
  });

  it('returns 200 with stub:false and mapped deploys on a successful Vercel response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        deployments: [
          {
            uid: 'dpl_abc123',
            url: 'wander-abc123.vercel.app',
            state: 'READY',
            readyState: 'READY',
            createdAt: 1_700_000_000_000,
            meta: {
              githubCommitRef: 'main',
              githubCommitSha: 'abc1234567890',
              githubCommitMessage: 'feat: add status page',
            },
          },
        ],
      }),
    });

    const res = makeRes();
    await handler({}, res);

    expect(res._status).toBe(200);
    expect(res._body.stub).toBe(false);
    expect(res._body.deploys).toHaveLength(1);

    const d = res._body.deploys[0];
    expect(d.id).toBe('dpl_abc123');
    expect(d.url).toBe('https://wander-abc123.vercel.app');
    expect(d.state).toBe('success');
    expect(d.branch).toBe('main');
    expect(d.commit).toBe('abc1234');                // first 7 chars
    expect(d.commitMessage).toBe('feat: add status page');
  });

  it('maps ERROR state to "failed"', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        deployments: [{ uid: 'd1', url: 'x.vercel.app', state: 'ERROR', createdAt: Date.now(), meta: {} }],
      }),
    });

    const res = makeRes();
    await handler({}, res);
    expect(res._body.deploys[0].state).toBe('failed');
  });

  it('maps BUILDING state to "building"', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        deployments: [{ uid: 'd2', url: 'y.vercel.app', state: 'BUILDING', createdAt: Date.now(), meta: {} }],
      }),
    });

    const res = makeRes();
    await handler({}, res);
    expect(res._body.deploys[0].state).toBe('building');
  });

  it('returns 502 when the Vercel API responds with a non-ok status', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    });

    const res = makeRes();
    await handler({}, res);
    expect(res._status).toBe(502);
    expect(res._body.error).toBe('Vercel API error');
  });

  it('returns 502 when fetch throws (network error)', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const res = makeRes();
    await handler({}, res);
    expect(res._status).toBe(502);
    expect(res._body.error).toBe('fetch failed');
  });

  it('includes teamId query param when VERCEL_TEAM_ID is set', async () => {
    process.env.VERCEL_TEAM_ID = 'team_xyz';
    let capturedUrl = '';
    globalThis.fetch = vi.fn().mockImplementation((url) => {
      capturedUrl = url;
      return Promise.resolve({
        ok: true,
        json: async () => ({ deployments: [] }),
      });
    });

    const res = makeRes();
    await handler({}, res);
    expect(capturedUrl).toContain('teamId=team_xyz');
  });
});
