import { describe, it, expect } from 'vitest';
import {
  generateState,
  parseCookies,
  buildGoogleAuthUrl,
  buildGitHubAuthUrl,
} from '../api/_lib/oauth.js';

// ── generateState ─────────────────────────────────────────────────────────────

describe('generateState', () => {
  it('returns a non-empty string', () => {
    const state = generateState();
    expect(typeof state).toBe('string');
    expect(state.length).toBeGreaterThan(0);
  });

  it('returns a hex string of the expected length', () => {
    // randomBytes(24) → 48 hex chars
    const state = generateState();
    expect(state).toMatch(/^[0-9a-f]{48}$/);
  });

  it('generates a unique value on each call', () => {
    const a = generateState();
    const b = generateState();
    expect(a).not.toBe(b);
  });
});

// ── parseCookies ──────────────────────────────────────────────────────────────

describe('parseCookies', () => {
  it('returns empty object for undefined input', () => {
    expect(parseCookies(undefined)).toEqual({});
  });

  it('parses a single cookie', () => {
    expect(parseCookies('foo=bar')).toEqual({ foo: 'bar' });
  });

  it('parses multiple cookies', () => {
    expect(parseCookies('a=1; b=2; c=3')).toEqual({ a: '1', b: '2', c: '3' });
  });

  it('preserves values that contain =', () => {
    // Base64 values commonly contain "="
    const b64 = 'abc=def==';
    const result = parseCookies(`token=${b64}`);
    expect(result.token).toBe(b64);
  });

  it('trims surrounding whitespace from cookie pairs', () => {
    // c.trim() strips outer whitespace from the whole "key=value" chunk,
    // so both leading/trailing spaces are removed from the value as well.
    const result = parseCookies(' session = xyz ');
    expect(result.session).toBe(' xyz');
  });
});

// ── buildGoogleAuthUrl ────────────────────────────────────────────────────────

describe('buildGoogleAuthUrl', () => {
  const STATE        = 'test-state-token';
  const CLIENT_ID    = 'google-client-id';
  const REDIRECT_URI = 'https://example.com/api/auth/callback/google';

  it('starts with the Google authorization endpoint', () => {
    const url = buildGoogleAuthUrl(STATE, CLIENT_ID, REDIRECT_URI);
    expect(url).toMatch(/^https:\/\/accounts\.google\.com\/o\/oauth2\/v2\/auth/);
  });

  it('includes client_id', () => {
    const url = buildGoogleAuthUrl(STATE, CLIENT_ID, REDIRECT_URI);
    expect(url).toContain(`client_id=${encodeURIComponent(CLIENT_ID)}`);
  });

  it('includes the state param', () => {
    const url = buildGoogleAuthUrl(STATE, CLIENT_ID, REDIRECT_URI);
    expect(url).toContain(`state=${STATE}`);
  });

  it('includes openid scope', () => {
    const url = buildGoogleAuthUrl(STATE, CLIENT_ID, REDIRECT_URI);
    expect(url).toContain('scope=');
    expect(decodeURIComponent(url)).toContain('openid');
  });

  it('includes response_type=code', () => {
    const url = buildGoogleAuthUrl(STATE, CLIENT_ID, REDIRECT_URI);
    expect(url).toContain('response_type=code');
  });

  it('includes the redirect_uri', () => {
    const url = buildGoogleAuthUrl(STATE, CLIENT_ID, REDIRECT_URI);
    expect(decodeURIComponent(url)).toContain(REDIRECT_URI);
  });
});

// ── buildGitHubAuthUrl ────────────────────────────────────────────────────────

describe('buildGitHubAuthUrl', () => {
  const STATE        = 'test-github-state';
  const CLIENT_ID    = 'github-client-id';
  const REDIRECT_URI = 'https://example.com/api/auth/callback/github';

  it('starts with the GitHub authorization endpoint', () => {
    const url = buildGitHubAuthUrl(STATE, CLIENT_ID, REDIRECT_URI);
    expect(url).toMatch(/^https:\/\/github\.com\/login\/oauth\/authorize/);
  });

  it('includes client_id', () => {
    const url = buildGitHubAuthUrl(STATE, CLIENT_ID, REDIRECT_URI);
    expect(url).toContain(`client_id=${encodeURIComponent(CLIENT_ID)}`);
  });

  it('includes the state param', () => {
    const url = buildGitHubAuthUrl(STATE, CLIENT_ID, REDIRECT_URI);
    expect(url).toContain(`state=${STATE}`);
  });

  it('requests read:user scope', () => {
    const url = buildGitHubAuthUrl(STATE, CLIENT_ID, REDIRECT_URI);
    expect(decodeURIComponent(url)).toContain('read:user');
  });

  it('includes the redirect_uri', () => {
    const url = buildGitHubAuthUrl(STATE, CLIENT_ID, REDIRECT_URI);
    expect(decodeURIComponent(url)).toContain(REDIRECT_URI);
  });
});
