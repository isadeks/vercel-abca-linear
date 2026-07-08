import { describe, it, expect } from 'vitest';
import handler from '../api/contact.js';

/**
 * Minimal mock of a Vercel/Express-style (req, res) pair.
 */
function makeReqRes({ method = 'POST', body = {} } = {}) {
  const req = { method, body };
  const res = {
    _status: null,
    _body: null,
    status(code) { this._status = code; return this; },
    json(data)  { this._body  = data; return this; },
  };
  return { req, res };
}

describe('POST /api/contact', () => {
  describe('happy path', () => {
    it('returns 200 with ok:true for a valid submission', () => {
      const { req, res } = makeReqRes({
        body: { name: 'Alice', email: 'alice@example.com', subject: 'General enquiry', message: 'Hello!' },
      });
      handler(req, res);
      expect(res._status).toBe(200);
      expect(res._body.ok).toBe(true);
    });
  });

  describe('validation errors', () => {
    it('returns 400 when name is missing', () => {
      const { req, res } = makeReqRes({
        body: { name: '', email: 'a@b.com', subject: 'Other', message: 'Hi' },
      });
      handler(req, res);
      expect(res._status).toBe(400);
      expect(res._body.ok).toBe(false);
      expect(res._body.error).toMatch(/name/i);
    });

    it('returns 400 when email is invalid', () => {
      const { req, res } = makeReqRes({
        body: { name: 'Bob', email: 'not-an-email', subject: 'Other', message: 'Hi' },
      });
      handler(req, res);
      expect(res._status).toBe(400);
      expect(res._body.error).toMatch(/email/i);
    });

    it('returns 400 when subject is missing', () => {
      const { req, res } = makeReqRes({
        body: { name: 'Carol', email: 'carol@x.com', subject: '', message: 'Hi' },
      });
      handler(req, res);
      expect(res._status).toBe(400);
      expect(res._body.error).toMatch(/subject/i);
    });

    it('returns 400 when message is missing', () => {
      const { req, res } = makeReqRes({
        body: { name: 'Dave', email: 'dave@x.com', subject: 'Other', message: '   ' },
      });
      handler(req, res);
      expect(res._status).toBe(400);
      expect(res._body.error).toMatch(/message/i);
    });

    it('returns 400 when body is entirely absent', () => {
      const { req, res } = makeReqRes({ body: null });
      // body is null — req.body ?? {} falls back to {}
      req.body = null;
      handler(req, res);
      expect(res._status).toBe(400);
      expect(res._body.ok).toBe(false);
    });
  });

  describe('wrong method', () => {
    it('returns 405 for a GET request', () => {
      const { req, res } = makeReqRes({ method: 'GET' });
      handler(req, res);
      expect(res._status).toBe(405);
      expect(res._body.ok).toBe(false);
    });

    it('returns 405 for a PUT request', () => {
      const { req, res } = makeReqRes({ method: 'PUT' });
      handler(req, res);
      expect(res._status).toBe(405);
    });
  });
});
