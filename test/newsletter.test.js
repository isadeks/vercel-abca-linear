import { describe, it, expect, beforeEach } from 'vitest';
import { validateEmail } from '../api/_lib/newsletter.js';
import handler, { subscribers } from '../api/newsletter.js';

// ---------------------------------------------------------------------------
// validateEmail() — unit tests
// ---------------------------------------------------------------------------

describe('validateEmail()', () => {
  describe('valid addresses', () => {
    it('accepts a plain address', () => {
      expect(validateEmail('user@example.com')).toBe(true);
    });

    it('accepts subdomains', () => {
      expect(validateEmail('user@mail.example.co.uk')).toBe(true);
    });

    it('accepts plus-addressing', () => {
      expect(validateEmail('user+tag@example.com')).toBe(true);
    });

    it('accepts dots in the local part', () => {
      expect(validateEmail('first.last@example.com')).toBe(true);
    });

    it('accepts numeric local parts', () => {
      expect(validateEmail('123@example.com')).toBe(true);
    });
  });

  describe('missing / empty input', () => {
    it('rejects undefined', () => {
      expect(validateEmail(undefined)).toBe(false);
    });

    it('rejects null', () => {
      expect(validateEmail(null)).toBe(false);
    });

    it('rejects an empty string', () => {
      expect(validateEmail('')).toBe(false);
    });

    it('rejects a whitespace-only string', () => {
      expect(validateEmail('   ')).toBe(false);
    });

    it('rejects a number', () => {
      expect(validateEmail(42)).toBe(false);
    });
  });

  describe('malformed strings', () => {
    it('rejects missing @', () => {
      expect(validateEmail('userexample.com')).toBe(false);
    });

    it('rejects missing domain', () => {
      expect(validateEmail('user@')).toBe(false);
    });

    it('rejects missing local part', () => {
      expect(validateEmail('@example.com')).toBe(false);
    });

    it('rejects missing TLD dot', () => {
      expect(validateEmail('user@examplecom')).toBe(false);
    });

    it('rejects embedded spaces', () => {
      expect(validateEmail('us er@example.com')).toBe(false);
    });

    it('rejects multiple @', () => {
      expect(validateEmail('a@b@example.com')).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// POST /api/newsletter — endpoint tests
// ---------------------------------------------------------------------------

/**
 * Minimal request/response mocks that mimic the Vercel handler contract
 * without requiring an actual HTTP server.
 */
function makeReq({ method = 'POST', body = {} } = {}) {
  return { method, body };
}

function makeRes() {
  const res = {
    _status: null,
    _body: null,
    status(code) {
      this._status = code;
      return this;
    },
    json(body) {
      this._body = body;
      return this;
    },
  };
  return res;
}

describe('POST /api/newsletter', () => {
  // Reset in-memory list before each test so tests are independent.
  beforeEach(() => {
    subscribers.length = 0;
  });

  describe('success responses', () => {
    it('returns 200 with status ok for a valid email', () => {
      const req = makeReq({ body: { email: 'hello@example.com' } });
      const res = makeRes();
      handler(req, res);
      expect(res._status).toBe(200);
      expect(res._body.status).toBe('ok');
    });

    it('includes a message field on success', () => {
      const req = makeReq({ body: { email: 'hello@example.com' } });
      const res = makeRes();
      handler(req, res);
      expect(typeof res._body.message).toBe('string');
      expect(res._body.message.length).toBeGreaterThan(0);
    });

    it('stores the email in the in-memory list', () => {
      const req = makeReq({ body: { email: 'store@example.com' } });
      const res = makeRes();
      handler(req, res);
      expect(subscribers).toContain('store@example.com');
    });

    it('accumulates multiple subscribers', () => {
      handler(makeReq({ body: { email: 'a@example.com' } }), makeRes());
      handler(makeReq({ body: { email: 'b@example.com' } }), makeRes());
      expect(subscribers).toHaveLength(2);
    });
  });

  describe('error responses — invalid email', () => {
    it('returns 400 for an empty email', () => {
      const req = makeReq({ body: { email: '' } });
      const res = makeRes();
      handler(req, res);
      expect(res._status).toBe(400);
      expect(res._body.status).toBe('error');
    });

    it('returns 400 for a missing email field', () => {
      const req = makeReq({ body: {} });
      const res = makeRes();
      handler(req, res);
      expect(res._status).toBe(400);
      expect(res._body.status).toBe('error');
    });

    it('returns 400 for a malformed email', () => {
      const req = makeReq({ body: { email: 'not-an-email' } });
      const res = makeRes();
      handler(req, res);
      expect(res._status).toBe(400);
      expect(res._body.status).toBe('error');
    });

    it('does not store an invalid email', () => {
      const req = makeReq({ body: { email: 'bad' } });
      const res = makeRes();
      handler(req, res);
      expect(subscribers).toHaveLength(0);
    });

    it('includes a message field on error', () => {
      const req = makeReq({ body: { email: '' } });
      const res = makeRes();
      handler(req, res);
      expect(typeof res._body.message).toBe('string');
      expect(res._body.message.length).toBeGreaterThan(0);
    });
  });

  describe('error responses — wrong method', () => {
    it('returns 405 for a GET request', () => {
      const req = makeReq({ method: 'GET' });
      const res = makeRes();
      handler(req, res);
      expect(res._status).toBe(405);
      expect(res._body.status).toBe('error');
    });

    it('returns 405 for a DELETE request', () => {
      const req = makeReq({ method: 'DELETE' });
      const res = makeRes();
      handler(req, res);
      expect(res._status).toBe(405);
    });
  });
});
