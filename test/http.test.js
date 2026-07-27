import { describe, it, expect } from 'vitest';
import {
  parseCookies,
  getSessionId,
  buildSessionCookie,
  clearSessionCookie,
  SESSION_COOKIE,
} from '../api/_lib/http.js';

describe('http: cookies', () => {
  it('parses a cookie header', () => {
    const req = { headers: { cookie: 'a=1; wander_session=abc; b=2' } };
    expect(parseCookies(req)).toEqual({ a: '1', wander_session: 'abc', b: '2' });
  });

  it('handles a missing cookie header', () => {
    expect(parseCookies({ headers: {} })).toEqual({});
    expect(parseCookies({})).toEqual({});
  });

  it('extracts the session id', () => {
    const req = { headers: { cookie: `${SESSION_COOKIE}=tok123` } };
    expect(getSessionId(req)).toBe('tok123');
    expect(getSessionId({ headers: {} })).toBeNull();
  });

  it('builds an HttpOnly, SameSite session cookie', () => {
    const cookie = buildSessionCookie('tok123');
    expect(cookie).toContain(`${SESSION_COOKIE}=tok123`);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Path=/');
    expect(cookie).toMatch(/Max-Age=\d+/);
  });

  it('clears the cookie with a zero max-age and past expiry', () => {
    const cookie = clearSessionCookie();
    expect(cookie).toContain('Max-Age=0');
    expect(cookie).toContain('Expires=Thu, 01 Jan 1970');
  });
});
