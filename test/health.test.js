import { describe, it, expect, vi } from 'vitest';
import handler from '../api/health.js';
import { getHealth } from '../api/_lib/health.js';
import { runHealthCheck } from '../api/_lib/health-cli.js';

// Minimal stand-in for the Vercel (req, res) pair so the handler can be
// exercised without a running server.
function mockRes() {
  return {
    statusCode: undefined,
    body: undefined,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
    },
  };
}

describe('getHealth()', () => {
  it('reports ok status', () => {
    expect(getHealth().status).toBe('ok');
  });

  it('reports a non-empty version string', () => {
    const { version } = getHealth();
    expect(typeof version).toBe('string');
    expect(version.length).toBeGreaterThan(0);
  });

  it('returns exactly { status, version }', () => {
    expect(Object.keys(getHealth()).sort()).toEqual(['status', 'version']);
  });
});

describe('GET /health', () => {
  it('responds with a 200 status', () => {
    const res = mockRes();
    handler({ method: 'GET' }, res);
    expect(res.statusCode).toBe(200);
  });

  it('responds with the { status: "ok", version } JSON shape', () => {
    const res = mockRes();
    handler({ method: 'GET' }, res);
    expect(res.body).toEqual({ status: 'ok', version: expect.any(String) });
    expect(res.body.version.length).toBeGreaterThan(0);
  });

  it('rejects non-GET methods with 405', () => {
    const res = mockRes();
    handler({ method: 'POST' }, res);
    expect(res.statusCode).toBe(405);
    expect(res.headers.Allow).toBe('GET');
  });
});

describe('health CLI check', () => {
  it('returns exit code 0 when healthy', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    expect(runHealthCheck()).toBe(0);
    log.mockRestore();
  });
});
