import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  getAuthorizationUrl,
  exchangeCodeForToken,
  fetchUserInfo,
  createOAuthState,
  verifyOAuthState,
  _resetOAuthStateStore,
  SUPPORTED_PROVIDERS,
} from '../api/_lib/oauth.js';

beforeEach(() => {
  _resetOAuthStateStore();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// SUPPORTED_PROVIDERS
// ---------------------------------------------------------------------------

describe('SUPPORTED_PROVIDERS', () => {
  it('includes google and github', () => {
    expect(SUPPORTED_PROVIDERS).toContain('google');
    expect(SUPPORTED_PROVIDERS).toContain('github');
  });
});

// ---------------------------------------------------------------------------
// getAuthorizationUrl
// ---------------------------------------------------------------------------

describe('getAuthorizationUrl', () => {
  it('builds a valid Google authorization URL', () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', 'test-google-id');
    const state = 'some-state';
    const url = getAuthorizationUrl('google', state, 'http://localhost/callback');
    expect(url).toContain('accounts.google.com');
    expect(url).toContain('client_id=test-google-id');
    expect(url).toContain(`state=${state}`);
    expect(url).toContain('response_type=code');
    expect(url).toContain('scope=');
  });

  it('builds a valid GitHub authorization URL', () => {
    vi.stubEnv('GITHUB_CLIENT_ID', 'test-github-id');
    const url = getAuthorizationUrl('github', 'st', 'http://localhost/callback');
    expect(url).toContain('github.com/login/oauth/authorize');
    expect(url).toContain('client_id=test-github-id');
  });

  it('throws when client ID is not configured', () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', '');
    expect(() =>
      getAuthorizationUrl('google', 'st', 'http://localhost/callback'),
    ).toThrow('not configured');
  });

  it('throws for unsupported provider', () => {
    expect(() =>
      getAuthorizationUrl('twitter', 'st', 'http://localhost/callback'),
    ).toThrow('Unsupported');
  });
});

// ---------------------------------------------------------------------------
// exchangeCodeForToken
// ---------------------------------------------------------------------------

describe('exchangeCodeForToken', () => {
  it('returns access_token on successful exchange', async () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', 'gid');
    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'gsecret');

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok:   true,
      json: async () => ({ access_token: 'at-123' }),
    });

    const token = await exchangeCodeForToken('google', 'code-abc', 'http://localhost/cb');
    expect(token).toBe('at-123');
  });

  it('throws when provider returns an error field', async () => {
    vi.stubEnv('GITHUB_CLIENT_ID', 'ghid');
    vi.stubEnv('GITHUB_CLIENT_SECRET', 'ghsecret');

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok:   true,
      json: async () => ({ error: 'bad_verification_code', error_description: 'Code expired' }),
    });

    await expect(exchangeCodeForToken('github', 'bad-code', 'http://localhost/cb'))
      .rejects.toThrow('Code expired');
  });

  it('throws on HTTP error status', async () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', 'gid');
    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'gsecret');

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: false, status: 500 });

    await expect(exchangeCodeForToken('google', 'code', 'http://localhost/cb'))
      .rejects.toThrow('500');
  });

  it('throws when credentials not configured', async () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', '');
    vi.stubEnv('GOOGLE_CLIENT_SECRET', '');
    await expect(exchangeCodeForToken('google', 'code', 'http://localhost/cb'))
      .rejects.toThrow('not configured');
  });
});

// ---------------------------------------------------------------------------
// fetchUserInfo
// ---------------------------------------------------------------------------

describe('fetchUserInfo — Google', () => {
  it('normalises Google profile', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok:   true,
      json: async () => ({ id: '10001', email: 'user@gmail.com', name: 'Test User' }),
    });

    const info = await fetchUserInfo('google', 'at-google');
    expect(info.id).toBe('10001');
    expect(info.email).toBe('user@gmail.com');
    expect(info.name).toBe('Test User');
  });

  it('throws on HTTP error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: false, status: 401 });
    await expect(fetchUserInfo('google', 'bad-token')).rejects.toThrow('401');
  });
});

describe('fetchUserInfo — GitHub', () => {
  it('normalises GitHub profile with public email', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok:   true,
      json: async () => ({ id: 99, email: 'dev@github.com', name: 'Dev User', login: 'devuser' }),
    });

    const info = await fetchUserInfo('github', 'at-gh');
    expect(info.id).toBe('99');
    expect(info.email).toBe('dev@github.com');
    expect(info.name).toBe('Dev User');
  });

  it('fetches email from /user/emails when main profile email is null', async () => {
    // First call: main profile (no email)
    // Second call: emails list
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok:   true,
        json: async () => ({ id: 100, email: null, login: 'nomail' }),
      })
      .mockResolvedValueOnce({
        ok:   true,
        json: async () => [
          { email: 'private@users.noreply.github.com', primary: false, verified: true },
          { email: 'real@example.com', primary: true,  verified: true  },
        ],
      });

    const info = await fetchUserInfo('github', 'at-gh2');
    expect(info.email).toBe('real@example.com');
  });
});

// ---------------------------------------------------------------------------
// OAuth state store
// ---------------------------------------------------------------------------

describe('createOAuthState / verifyOAuthState', () => {
  it('generates a unique state', () => {
    const s1 = createOAuthState();
    const s2 = createOAuthState();
    expect(typeof s1).toBe('string');
    expect(s1.length).toBeGreaterThan(8);
    expect(s1).not.toBe(s2);
  });

  it('verifies a valid state', () => {
    const state = createOAuthState();
    expect(verifyOAuthState(state)).toBe(true);
  });

  it('invalidates state after first use (one-time)', () => {
    const state = createOAuthState();
    expect(verifyOAuthState(state)).toBe(true);
    expect(verifyOAuthState(state)).toBe(false); // consumed
  });

  it('rejects unknown state', () => {
    expect(verifyOAuthState('definitely-not-a-real-state')).toBe(false);
  });

  it('rejects empty or null state', () => {
    expect(verifyOAuthState('')).toBe(false);
    expect(verifyOAuthState(null)).toBe(false);
  });
});
