/**
 * Tests for api/_lib/notificationsClientContext.js
 *
 * Covers:
 *   - createNotificationsClientContext factory
 *   - userId get / setUserId
 *   - prefs snapshot (DEFAULT_PREFS)
 *   - loadPrefs / savePrefs / resetPrefs via mock fetch
 *   - applyPrefs (no network)
 *   - subscribe / unsubscribe
 *   - setUserId clears prefs and notifies
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createNotificationsClientContext } from '../api/_lib/notificationsClientContext.js';

// ─── mock fetch ──────────────────────────────────────────────────────────────

/** @type {ReturnType<typeof vi.fn>} */
let fetchMock;

beforeEach(() => {
  fetchMock = vi.fn();
  globalThis.fetch = fetchMock;
});

afterEach(() => {
  vi.restoreAllMocks();
  delete globalThis.fetch;
});

function mockFetchOk(body) {
  fetchMock.mockResolvedValueOnce({
    ok: true,
    json: async () => body,
  });
}

function mockFetchError(status, body) {
  fetchMock.mockResolvedValueOnce({
    ok: false,
    status,
    json: async () => body,
  });
}

// ─── helpers ─────────────────────────────────────────────────────────────────

const SAMPLE_PREFS = {
  emailBookingConfirmations: true,
  emailNewsletters:          true,
  emailMarketing:            false,
  inAppBookingUpdates:       true,
  inAppSystemAlerts:         false,
  inAppPromotions:           false,
};

// ─── Factory ──────────────────────────────────────────────────────────────────

describe('createNotificationsClientContext', () => {
  it('returns an object with the expected interface', () => {
    const ctx = createNotificationsClientContext();
    expect(typeof ctx.userId).toBe('object'); // null
    expect(typeof ctx.prefs).toBe('object');
    expect(typeof ctx.setUserId).toBe('function');
    expect(typeof ctx.loadPrefs).toBe('function');
    expect(typeof ctx.savePrefs).toBe('function');
    expect(typeof ctx.resetPrefs).toBe('function');
    expect(typeof ctx.applyPrefs).toBe('function');
    expect(typeof ctx.subscribe).toBe('function');
  });
});

// ─── userId ───────────────────────────────────────────────────────────────────

describe('setUserId', () => {
  it('starts as null', () => {
    const ctx = createNotificationsClientContext();
    expect(ctx.userId).toBeNull();
  });

  it('sets a userId string', () => {
    const ctx = createNotificationsClientContext();
    ctx.setUserId('alice');
    expect(ctx.userId).toBe('alice');
  });

  it('trims whitespace', () => {
    const ctx = createNotificationsClientContext();
    ctx.setUserId('  bob  ');
    expect(ctx.userId).toBe('bob');
  });

  it('treats empty string as null', () => {
    const ctx = createNotificationsClientContext();
    ctx.setUserId('');
    expect(ctx.userId).toBeNull();
  });

  it('accepts null to clear userId', () => {
    const ctx = createNotificationsClientContext();
    ctx.setUserId('alice');
    ctx.setUserId(null);
    expect(ctx.userId).toBeNull();
  });

  it('notifies subscribers on change', () => {
    const ctx = createNotificationsClientContext();
    let calls = 0;
    ctx.subscribe(() => calls++);
    ctx.setUserId('alice');
    expect(calls).toBe(1);
  });

  it('does not notify if userId unchanged', () => {
    const ctx = createNotificationsClientContext();
    ctx.setUserId('alice');
    let calls = 0;
    ctx.subscribe(() => calls++);
    ctx.setUserId('alice'); // same value
    expect(calls).toBe(0);
  });

  it('resets prefs to defaults when userId changes', () => {
    const ctx = createNotificationsClientContext();
    ctx.applyPrefs({ emailNewsletters: true });
    ctx.setUserId('new-user');
    expect(ctx.prefs.emailNewsletters).toBe(false); // back to default
  });
});

// ─── prefs snapshot ───────────────────────────────────────────────────────────

describe('prefs getter', () => {
  it('returns a copy of defaults initially', () => {
    const ctx = createNotificationsClientContext();
    const p = ctx.prefs;
    expect(p.emailBookingConfirmations).toBe(true);
    expect(p.emailNewsletters).toBe(false);
    expect(p.inAppBookingUpdates).toBe(true);
    expect(p.inAppSystemAlerts).toBe(true);
  });

  it('returns a copy, not the live object', () => {
    const ctx = createNotificationsClientContext();
    const p1 = ctx.prefs;
    ctx.applyPrefs({ emailNewsletters: true });
    const p2 = ctx.prefs;
    expect(p1.emailNewsletters).toBe(false);
    expect(p2.emailNewsletters).toBe(true);
  });
});

// ─── applyPrefs ───────────────────────────────────────────────────────────────

describe('applyPrefs', () => {
  it('merges snapshot with defaults', () => {
    const ctx = createNotificationsClientContext();
    ctx.applyPrefs({ emailNewsletters: true });
    expect(ctx.prefs.emailNewsletters).toBe(true);
    expect(ctx.prefs.emailBookingConfirmations).toBe(true); // default preserved
  });

  it('notifies subscribers', () => {
    const ctx = createNotificationsClientContext();
    let calls = 0;
    ctx.subscribe(() => calls++);
    ctx.applyPrefs({ emailNewsletters: true });
    expect(calls).toBe(1);
  });
});

// ─── loadPrefs ────────────────────────────────────────────────────────────────

describe('loadPrefs', () => {
  it('returns current prefs without fetching when userId is null', async () => {
    const ctx = createNotificationsClientContext();
    const prefs = await ctx.loadPrefs();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(prefs.emailBookingConfirmations).toBe(true);
  });

  it('fetches from API and updates state', async () => {
    const ctx = createNotificationsClientContext({ prefsApiBase: '/mock/prefs' });
    ctx.setUserId('alice');
    mockFetchOk({ prefs: SAMPLE_PREFS });
    const prefs = await ctx.loadPrefs();
    expect(fetchMock).toHaveBeenCalledWith('/mock/prefs?userId=alice');
    expect(prefs.emailNewsletters).toBe(true);
    expect(ctx.prefs.emailNewsletters).toBe(true);
  });

  it('notifies subscribers after load', async () => {
    const ctx = createNotificationsClientContext({ prefsApiBase: '/mock/prefs' });
    ctx.setUserId('alice');
    mockFetchOk({ prefs: SAMPLE_PREFS });
    let calls = 0;
    ctx.subscribe(() => calls++);
    await ctx.loadPrefs();
    expect(calls).toBe(1);
  });

  it('throws when API returns an error', async () => {
    const ctx = createNotificationsClientContext({ prefsApiBase: '/mock/prefs' });
    ctx.setUserId('alice');
    mockFetchError(500, { error: 'Server exploded' });
    await expect(ctx.loadPrefs()).rejects.toThrow('Server exploded');
  });
});

// ─── savePrefs ────────────────────────────────────────────────────────────────

describe('savePrefs', () => {
  it('throws when userId is null', async () => {
    const ctx = createNotificationsClientContext();
    await expect(ctx.savePrefs({ emailNewsletters: true })).rejects.toThrow();
  });

  it('POSTs to API with userId + updates', async () => {
    const ctx = createNotificationsClientContext({ prefsApiBase: '/mock/prefs' });
    ctx.setUserId('alice');
    mockFetchOk({ prefs: { ...SAMPLE_PREFS, emailNewsletters: true } });
    await ctx.savePrefs({ emailNewsletters: true });
    expect(fetchMock).toHaveBeenCalledWith(
      '/mock/prefs',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.userId).toBe('alice');
    expect(body.emailNewsletters).toBe(true);
  });

  it('updates local prefs on success', async () => {
    const ctx = createNotificationsClientContext({ prefsApiBase: '/mock/prefs' });
    ctx.setUserId('alice');
    mockFetchOk({ prefs: { ...SAMPLE_PREFS, emailNewsletters: true } });
    await ctx.savePrefs({ emailNewsletters: true });
    expect(ctx.prefs.emailNewsletters).toBe(true);
  });

  it('throws on API error', async () => {
    const ctx = createNotificationsClientContext({ prefsApiBase: '/mock/prefs' });
    ctx.setUserId('alice');
    mockFetchError(400, { error: 'Bad request' });
    await expect(ctx.savePrefs({ emailNewsletters: 'oops' })).rejects.toThrow('Bad request');
  });
});

// ─── resetPrefs ───────────────────────────────────────────────────────────────

describe('resetPrefs', () => {
  it('throws when userId is null', async () => {
    const ctx = createNotificationsClientContext();
    await expect(ctx.resetPrefs()).rejects.toThrow();
  });

  it('sends DELETE to API', async () => {
    const ctx = createNotificationsClientContext({ prefsApiBase: '/mock/prefs' });
    ctx.setUserId('alice');
    mockFetchOk({ prefs: SAMPLE_PREFS });
    await ctx.resetPrefs();
    expect(fetchMock).toHaveBeenCalledWith(
      '/mock/prefs?userId=alice',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('updates local prefs after reset', async () => {
    const ctx = createNotificationsClientContext({ prefsApiBase: '/mock/prefs' });
    ctx.setUserId('alice');
    ctx.applyPrefs({ emailNewsletters: true });
    const defaultPrefs = {
      emailBookingConfirmations: true,
      emailNewsletters:          false,
      emailMarketing:            false,
      inAppBookingUpdates:       true,
      inAppSystemAlerts:         true,
      inAppPromotions:           false,
    };
    mockFetchOk({ prefs: defaultPrefs });
    await ctx.resetPrefs();
    expect(ctx.prefs.emailNewsletters).toBe(false);
  });
});

// ─── subscribe / unsubscribe ─────────────────────────────────────────────────

describe('subscribe / unsubscribe', () => {
  it('subscriber is called on applyPrefs', () => {
    const ctx = createNotificationsClientContext();
    let calls = 0;
    ctx.subscribe(() => calls++);
    ctx.applyPrefs({ emailNewsletters: true });
    expect(calls).toBe(1);
  });

  it('unsubscribe removes the listener', () => {
    const ctx = createNotificationsClientContext();
    let calls = 0;
    const unsub = ctx.subscribe(() => calls++);
    ctx.applyPrefs({ emailNewsletters: true });
    unsub();
    ctx.applyPrefs({ emailMarketing: true });
    expect(calls).toBe(1);
  });

  it('multiple subscribers all receive notifications', () => {
    const ctx = createNotificationsClientContext();
    let a = 0; let b = 0;
    ctx.subscribe(() => a++);
    ctx.subscribe(() => b++);
    ctx.applyPrefs({ emailNewsletters: true });
    expect(a).toBe(1);
    expect(b).toBe(1);
  });
});
