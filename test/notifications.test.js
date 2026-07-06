import { describe, it, expect } from 'vitest';
import { handler } from '../api/notifications.js';

/**
 * Minimal mock for the Vercel/Express-style response object.
 */
function makeMockRes() {
  const res = {
    _status: null,
    _headers: {},
    _body: null,
    status(code) {
      this._status = code;
      return this;           // chainable
    },
    setHeader(name, value) {
      this._headers[name] = value;
      return this;
    },
    json(body) {
      this._body = body;
      return this;
    },
  };
  return res;
}

describe('GET /api/notifications', () => {
  it('returns HTTP 200', () => {
    const res = makeMockRes();
    handler({}, res);
    expect(res._status).toBe(200);
  });

  it('responds with a notifications array', () => {
    const res = makeMockRes();
    handler({}, res);
    expect(res._body).toHaveProperty('notifications');
    expect(Array.isArray(res._body.notifications)).toBe(true);
  });

  it('returns at least one notification', () => {
    const res = makeMockRes();
    handler({}, res);
    expect(res._body.notifications.length).toBeGreaterThan(0);
  });

  it('each notification has the required shape: id, title, timestamp, read', () => {
    const res = makeMockRes();
    handler({}, res);
    for (const notif of res._body.notifications) {
      expect(notif).toHaveProperty('id');
      expect(notif).toHaveProperty('title');
      expect(notif).toHaveProperty('timestamp');
      expect(notif).toHaveProperty('read');
    }
  });

  it('id is a number, title is a non-empty string, read is a boolean', () => {
    const res = makeMockRes();
    handler({}, res);
    for (const notif of res._body.notifications) {
      expect(typeof notif.id).toBe('number');
      expect(typeof notif.title).toBe('string');
      expect(notif.title.length).toBeGreaterThan(0);
      expect(typeof notif.read).toBe('boolean');
    }
  });

  it('timestamp is a valid ISO 8601 date string', () => {
    const res = makeMockRes();
    handler({}, res);
    for (const notif of res._body.notifications) {
      const d = new Date(notif.timestamp);
      expect(d.toString()).not.toBe('Invalid Date');
    }
  });

  it('sets Content-Type to application/json', () => {
    const res = makeMockRes();
    handler({}, res);
    expect(res._headers['Content-Type']).toBe('application/json');
  });
});
