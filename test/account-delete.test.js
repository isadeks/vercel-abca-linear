/**
 * test/account-delete.test.js — Unit tests for api/account/delete.js
 *
 * We test the exported `handleDelete()` function in isolation so no HTTP
 * server is required.
 */

import { describe, it, expect } from 'vitest';
import { handleDelete } from '../api/account/delete.js';

describe('handleDelete — happy path', () => {
  it('returns { deleted: true } when confirm is true', () => {
    const result = handleDelete({ confirm: true });
    expect(result).toEqual({ deleted: true });
  });
});

describe('handleDelete — missing / malformed body', () => {
  it('throws 400 when body is null', () => {
    expect(() => handleDelete(null)).toThrow();
  });

  it('throws with status 400 when body is null', () => {
    let caught;
    try { handleDelete(null); } catch (e) { caught = e; }
    expect(caught.status).toBe(400);
  });

  it('throws 400 when body is undefined', () => {
    let caught;
    try { handleDelete(undefined); } catch (e) { caught = e; }
    expect(caught.status).toBe(400);
  });

  it('throws 400 when body is a string', () => {
    let caught;
    try { handleDelete('yes'); } catch (e) { caught = e; }
    expect(caught.status).toBe(400);
  });
});

describe('handleDelete — confirm value checks', () => {
  it('throws 422 when confirm is false', () => {
    let caught;
    try { handleDelete({ confirm: false }); } catch (e) { caught = e; }
    expect(caught.status).toBe(422);
  });

  it('throws 422 when confirm key is missing', () => {
    let caught;
    try { handleDelete({}); } catch (e) { caught = e; }
    expect(caught.status).toBe(422);
  });

  it('throws 422 when confirm is a truthy string (not strict true)', () => {
    let caught;
    try { handleDelete({ confirm: 'yes' }); } catch (e) { caught = e; }
    expect(caught.status).toBe(422);
  });
});
