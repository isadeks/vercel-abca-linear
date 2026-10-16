/**
 * test/notifications.test.js — Unit tests for the notifications API handler.
 *
 * Runs in Node with no HTTP server; we call the handler directly with minimal
 * req/res stubs, mirroring the pattern used in the rest of this test suite.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import handler from '../api/notifications/index.js';

// ── Minimal req/res stubs ────────────────────────────────────────────────────

function makeReq(method = 'GET') {
  return { method };
}

function makeRes() {
  const headers = new Map();
  let body = '';
  return {
    statusCode: null,
    headers,
    setHeader(name, value) { headers.set(name.toLowerCase(), value); },
    end(data) { body = data; },
    get body() { return body; },
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('GET /api/notifications', () => {
  let req;
  let res;

  beforeEach(() => {
    req = makeReq('GET');
    res = makeRes();
    handler(req, res);
  });

  it('returns HTTP 200', () => {
    expect(res.statusCode).toBe(200);
  });

  it('sets Content-Type to application/json', () => {
    expect(res.headers.get('content-type')).toBe('application/json');
  });

  it('returns valid JSON', () => {
    expect(() => JSON.parse(res.body)).not.toThrow();
  });

  it('returns an array', () => {
    const data = JSON.parse(res.body);
    expect(Array.isArray(data)).toBe(true);
  });

  it('returns between 5 and 10 notifications', () => {
    const data = JSON.parse(res.body);
    expect(data.length).toBeGreaterThanOrEqual(5);
    expect(data.length).toBeLessThanOrEqual(10);
  });

  it('every item has a non-empty string id', () => {
    const data = JSON.parse(res.body);
    for (const item of data) {
      expect(typeof item.id).toBe('string');
      expect(item.id.length).toBeGreaterThan(0);
    }
  });

  it('every item has a non-empty string type', () => {
    const data = JSON.parse(res.body);
    for (const item of data) {
      expect(typeof item.type).toBe('string');
      expect(item.type.length).toBeGreaterThan(0);
    }
  });

  it('every item has a non-empty string message', () => {
    const data = JSON.parse(res.body);
    for (const item of data) {
      expect(typeof item.message).toBe('string');
      expect(item.message.length).toBeGreaterThan(0);
    }
  });

  it('every item has a non-empty string timestamp', () => {
    const data = JSON.parse(res.body);
    for (const item of data) {
      expect(typeof item.timestamp).toBe('string');
      expect(item.timestamp.length).toBeGreaterThan(0);
    }
  });

  it('every item has exactly the keys: id, type, message, timestamp', () => {
    const data = JSON.parse(res.body);
    const expectedKeys = new Set(['id', 'type', 'message', 'timestamp']);
    for (const item of data) {
      const actualKeys = new Set(Object.keys(item));
      expect(actualKeys).toEqual(expectedKeys);
    }
  });

  it('all ids are unique', () => {
    const data = JSON.parse(res.body);
    const ids = data.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('timestamps are valid ISO 8601 strings', () => {
    const data = JSON.parse(res.body);
    for (const item of data) {
      expect(isNaN(Date.parse(item.timestamp))).toBe(false);
    }
  });
});

describe('non-GET /api/notifications', () => {
  it('returns HTTP 405 for POST', () => {
    const req = makeReq('POST');
    const res = makeRes();
    handler(req, res);
    expect(res.statusCode).toBe(405);
  });

  it('returns HTTP 405 for DELETE', () => {
    const req = makeReq('DELETE');
    const res = makeRes();
    handler(req, res);
    expect(res.statusCode).toBe(405);
  });

  it('sets Allow header to GET on 405', () => {
    const req = makeReq('POST');
    const res = makeRes();
    handler(req, res);
    expect(res.headers.get('allow')).toBe('GET');
  });

  it('returns JSON error body on 405', () => {
    const req = makeReq('PUT');
    const res = makeRes();
    handler(req, res);
    const data = JSON.parse(res.body);
    expect(data).toHaveProperty('error');
  });
});
