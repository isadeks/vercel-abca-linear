import { describe, it, expect, vi } from 'vitest';

import {
  buildDigestPayload,
  renderDigestHtml,
  renderDigestText,
  processUserDigest,
  runDigestJob,
  DIGEST_CADENCES,
} from '../api/_lib/email-digest.js';

import {
  createNotification,
  getNotifications,
  getUndigested,
  markDigested,
} from '../api/_lib/notification-store.js';

import {
  NOTIFICATION_TYPES,
  FREQUENCIES,
  createPreferences,
  updatePreferences,
} from '../api/_lib/notifications.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function freshStores() {
  return {
    notifStore: new Map(),
    prefStore:  new Map(),
  };
}

/**
 * Build a minimal notification record (not in any store) for unit tests.
 */
function makeNotif(overrides = {}) {
  return {
    id:         `notif_test_${Math.random().toString(36).slice(2)}`,
    userId:     'u1',
    type:       NOTIFICATION_TYPES.PRICE_DROP,
    title:      'Price dropped!',
    body:       'Book now for the best deal.',
    read:       false,
    createdAt:  new Date().toISOString(),
    readAt:     null,
    digestedAt: null,
    ...overrides,
  };
}

/**
 * Return default prefs with email channel enabled and the given type set to
 * daily_digest / email.
 */
function prefsWithDailyEmail(userId = 'u1', type = NOTIFICATION_TYPES.PRICE_DROP) {
  return updatePreferences(createPreferences(userId), {
    channels: { email: true },
    types: {
      [type]: {
        enabled:   true,
        frequency: FREQUENCIES.DAILY_DIGEST,
        channels:  ['email'],
      },
    },
  });
}

function stubEmailProvider(overrides = {}) {
  return {
    sendEmail: vi.fn().mockResolvedValue({ messageId: 'msg_123' }),
    ...overrides,
  };
}

// ── DIGEST_CADENCES ───────────────────────────────────────────────────────────

describe('DIGEST_CADENCES', () => {
  it('exposes DAILY and WEEKLY values', () => {
    expect(DIGEST_CADENCES.DAILY).toBe(FREQUENCIES.DAILY_DIGEST);
    expect(DIGEST_CADENCES.WEEKLY).toBe(FREQUENCIES.WEEKLY_DIGEST);
  });

  it('is frozen', () => {
    expect(Object.isFrozen(DIGEST_CADENCES)).toBe(true);
  });
});

// ── buildDigestPayload ────────────────────────────────────────────────────────

describe('buildDigestPayload', () => {
  it('returns empty array when email channel is disabled', () => {
    const prefs = updatePreferences(createPreferences('u1'), {
      channels: { email: false },
    });
    const notifs = [makeNotif()];
    const result = buildDigestPayload(notifs, prefs, FREQUENCIES.DAILY_DIGEST);
    expect(result).toEqual([]);
  });

  it('filters by cadence — includes daily, excludes weekly', () => {
    const prefs  = prefsWithDailyEmail();
    const notif  = makeNotif({ type: NOTIFICATION_TYPES.PRICE_DROP });
    const result = buildDigestPayload([notif], prefs, FREQUENCIES.DAILY_DIGEST);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(notif.id);
  });

  it('filters by cadence — excludes daily when cadence is weekly', () => {
    const prefs  = prefsWithDailyEmail(); // PRICE_DROP → daily_digest
    const notif  = makeNotif({ type: NOTIFICATION_TYPES.PRICE_DROP });
    const result = buildDigestPayload([notif], prefs, FREQUENCIES.WEEKLY_DIGEST);
    expect(result).toEqual([]);
  });

  it('excludes disabled types', () => {
    const prefs = updatePreferences(createPreferences('u1'), {
      channels: { email: true },
      types: {
        [NOTIFICATION_TYPES.PRICE_DROP]: {
          enabled:   false,
          frequency: FREQUENCIES.DAILY_DIGEST,
          channels:  ['email'],
        },
      },
    });
    const notif  = makeNotif({ type: NOTIFICATION_TYPES.PRICE_DROP });
    const result = buildDigestPayload([notif], prefs, FREQUENCIES.DAILY_DIGEST);
    expect(result).toEqual([]);
  });

  it('excludes types where channels does not include email', () => {
    const prefs = updatePreferences(createPreferences('u1'), {
      channels: { email: true },
      types: {
        [NOTIFICATION_TYPES.PRICE_DROP]: {
          enabled:   true,
          frequency: FREQUENCIES.DAILY_DIGEST,
          channels:  ['sms'],
        },
      },
    });
    const notif  = makeNotif({ type: NOTIFICATION_TYPES.PRICE_DROP });
    const result = buildDigestPayload([notif], prefs, FREQUENCIES.DAILY_DIGEST);
    expect(result).toEqual([]);
  });

  it('returns empty when no undigested notifications match', () => {
    const prefs  = prefsWithDailyEmail();
    const result = buildDigestPayload([], prefs, FREQUENCIES.DAILY_DIGEST);
    expect(result).toEqual([]);
  });

  it('throws on invalid cadence', () => {
    const prefs = createPreferences('u1');
    expect(() =>
      buildDigestPayload([], prefs, 'immediate'),
    ).toThrow(/[Ii]nvalid cadence/);
  });

  it('handles notification type not in prefs', () => {
    const prefs  = createPreferences('u1');
    const notif  = makeNotif({ type: 'unknown_type' });
    // should not throw; just skip the notification
    const result = buildDigestPayload([notif], prefs, FREQUENCIES.DAILY_DIGEST);
    expect(result).toEqual([]);
  });
});

// ── renderDigestHtml ──────────────────────────────────────────────────────────

describe('renderDigestHtml', () => {
  const opts = { date: '2026-01-15T00:00:00.000Z' };

  it('returns a string containing the Daily cadence label', () => {
    const html = renderDigestHtml([], FREQUENCIES.DAILY_DIGEST, opts);
    expect(typeof html).toBe('string');
    expect(html).toContain('Daily');
  });

  it('returns a string containing the Weekly cadence label', () => {
    const html = renderDigestHtml([], FREQUENCIES.WEEKLY_DIGEST, opts);
    expect(html).toContain('Weekly');
  });

  it('contains notification title and body', () => {
    const notif = makeNotif({ title: 'Flight deal', body: 'Save 30% today.' });
    const html  = renderDigestHtml([notif], FREQUENCIES.DAILY_DIGEST, opts);
    expect(html).toContain('Flight deal');
    expect(html).toContain('Save 30% today.');
  });

  it('HTML-escapes < in title', () => {
    const notif = makeNotif({ title: 'Price < $100' });
    const html  = renderDigestHtml([notif], FREQUENCIES.DAILY_DIGEST, opts);
    expect(html).toContain('&lt;');
    expect(html).not.toContain('<$100');
  });

  it('HTML-escapes > in body', () => {
    const notif = makeNotif({ body: 'Savings > 50%' });
    const html  = renderDigestHtml([notif], FREQUENCIES.DAILY_DIGEST, opts);
    expect(html).toContain('&gt;');
  });

  it('HTML-escapes & in title', () => {
    const notif = makeNotif({ title: 'Hotels & Flights' });
    const html  = renderDigestHtml([notif], FREQUENCIES.DAILY_DIGEST, opts);
    expect(html).toContain('&amp;');
    expect(html).not.toContain('Hotels & Flights');
  });

  it('includes the date line', () => {
    const html = renderDigestHtml([], FREQUENCIES.DAILY_DIGEST, opts);
    expect(html).toContain('2026');
  });

  it('includes an unsubscribe footer note', () => {
    const html = renderDigestHtml([], FREQUENCIES.DAILY_DIGEST, opts);
    expect(html.toLowerCase()).toContain('unsubscribe');
  });

  it('returns a valid HTML string (starts with <!DOCTYPE html>)', () => {
    const html = renderDigestHtml([], FREQUENCIES.DAILY_DIGEST, opts);
    expect(html.trimStart()).toMatch(/^<!DOCTYPE html>/i);
  });
});

// ── renderDigestText ──────────────────────────────────────────────────────────

describe('renderDigestText', () => {
  const opts = { date: '2026-01-15T00:00:00.000Z' };

  it('returns plain text with notification titles', () => {
    const notif = makeNotif({ title: 'Weekend getaway deal' });
    const text  = renderDigestText([notif], FREQUENCIES.DAILY_DIGEST, opts);
    expect(typeof text).toBe('string');
    expect(text).toContain('Weekend getaway deal');
  });

  it('does not contain HTML tags', () => {
    const notif = makeNotif({ title: 'Beach resort', body: 'Limited offer.' });
    const text  = renderDigestText([notif], FREQUENCIES.DAILY_DIGEST, opts);
    expect(text).not.toMatch(/<[^>]+>/);
  });

  it('includes the cadence label', () => {
    const textDaily  = renderDigestText([], FREQUENCIES.DAILY_DIGEST,  opts);
    const textWeekly = renderDigestText([], FREQUENCIES.WEEKLY_DIGEST, opts);
    expect(textDaily).toContain('Daily');
    expect(textWeekly).toContain('Weekly');
  });

  it('includes body text when present', () => {
    const notif = makeNotif({ body: 'Hurry, limited availability.' });
    const text  = renderDigestText([notif], FREQUENCIES.DAILY_DIGEST, opts);
    expect(text).toContain('Hurry, limited availability.');
  });

  it('includes Type label', () => {
    const notif = makeNotif({ type: NOTIFICATION_TYPES.PRICE_DROP });
    const text  = renderDigestText([notif], FREQUENCIES.DAILY_DIGEST, opts);
    expect(text).toContain(`Type: ${NOTIFICATION_TYPES.PRICE_DROP}`);
  });
});

// ── processUserDigest ─────────────────────────────────────────────────────────

describe('processUserDigest', () => {
  it('returns { sent: false, reason: "no_items" } when no matching notifications', async () => {
    const { notifStore, prefStore } = freshStores();
    const emailProv = stubEmailProvider();

    const result = await processUserDigest(
      notifStore, prefStore, emailProv, 'u1', FREQUENCIES.DAILY_DIGEST,
    );

    expect(result.sent).toBe(false);
    expect(result.reason).toBe('no_items');
    expect(emailProv.sendEmail).not.toHaveBeenCalled();
  });

  it('calls emailProvider.sendEmail with correct subject and email address', async () => {
    const { notifStore, prefStore } = freshStores();
    const prefs = prefsWithDailyEmail('u1');
    prefStore.set('u1', prefs);

    createNotification(notifStore, {
      userId: 'u1',
      type:   NOTIFICATION_TYPES.PRICE_DROP,
      title:  'Cheap flights',
    });

    const emailProv = stubEmailProvider();

    await processUserDigest(
      notifStore, prefStore, emailProv, 'u1', FREQUENCIES.DAILY_DIGEST,
    );

    expect(emailProv.sendEmail).toHaveBeenCalledOnce();
    const call = emailProv.sendEmail.mock.calls[0][0];
    expect(call.to).toBe('u1@example.com');
    expect(call.subject).toContain('daily');
  });

  it('uses custom getUserEmail when provided', async () => {
    const { notifStore, prefStore } = freshStores();
    const prefs = prefsWithDailyEmail('u2');
    prefStore.set('u2', prefs);

    createNotification(notifStore, {
      userId: 'u2',
      type:   NOTIFICATION_TYPES.PRICE_DROP,
      title:  'Cheap flights',
    });

    const emailProv = stubEmailProvider();

    await processUserDigest(
      notifStore, prefStore, emailProv, 'u2', FREQUENCIES.DAILY_DIGEST,
      userId => `custom-${userId}@travel.com`,
    );

    const call = emailProv.sendEmail.mock.calls[0][0];
    expect(call.to).toBe('custom-u2@travel.com');
  });

  it('marks digested notifications after a successful send', async () => {
    const { notifStore, prefStore } = freshStores();
    const prefs = prefsWithDailyEmail('u3');
    prefStore.set('u3', prefs);

    const notif = createNotification(notifStore, {
      userId: 'u3',
      type:   NOTIFICATION_TYPES.PRICE_DROP,
      title:  'Deal!',
    });

    const emailProv = stubEmailProvider();
    await processUserDigest(
      notifStore, prefStore, emailProv, 'u3', FREQUENCIES.DAILY_DIGEST,
    );

    const afterSend = getNotifications(notifStore, 'u3').notifications;
    const sent = afterSend.find(n => n.id === notif.id);
    expect(sent.digestedAt).not.toBeNull();
    expect(typeof sent.digestedAt).toBe('string');
  });

  it('does NOT mark notifications that were filtered out (wrong cadence)', async () => {
    const { notifStore, prefStore } = freshStores();

    // u4 has PRICE_DROP → daily_digest (email channel enabled)
    const prefs = prefsWithDailyEmail('u4');
    // Also set newsletter to weekly_digest
    const prefs2 = updatePreferences(prefs, {
      types: {
        [NOTIFICATION_TYPES.NEWSLETTER]: {
          enabled:   true,
          frequency: FREQUENCIES.WEEKLY_DIGEST,
          channels:  ['email'],
        },
      },
    });
    prefStore.set('u4', prefs2);

    const dailyNotif  = createNotification(notifStore, {
      userId: 'u4',
      type:   NOTIFICATION_TYPES.PRICE_DROP,
      title:  'Daily deal',
    });
    const weeklyNotif = createNotification(notifStore, {
      userId: 'u4',
      type:   NOTIFICATION_TYPES.NEWSLETTER,
      title:  'Weekly update',
    });

    const emailProv = stubEmailProvider();
    await processUserDigest(
      notifStore, prefStore, emailProv, 'u4', FREQUENCIES.DAILY_DIGEST,
    );

    const all = getNotifications(notifStore, 'u4').notifications;
    const daily  = all.find(n => n.id === dailyNotif.id);
    const weekly = all.find(n => n.id === weeklyNotif.id);

    expect(daily.digestedAt).not.toBeNull();    // was included
    expect(weekly.digestedAt).toBeNull();       // was NOT included
  });

  it('returns { sent: false, reason: "send_error" } on provider error', async () => {
    const { notifStore, prefStore } = freshStores();
    const prefs = prefsWithDailyEmail('u5');
    prefStore.set('u5', prefs);

    createNotification(notifStore, {
      userId: 'u5',
      type:   NOTIFICATION_TYPES.PRICE_DROP,
      title:  'Deal!',
    });

    const emailProv = {
      sendEmail: vi.fn().mockRejectedValue(new Error('SMTP failure')),
    };

    const result = await processUserDigest(
      notifStore, prefStore, emailProv, 'u5', FREQUENCIES.DAILY_DIGEST,
    );

    expect(result.sent).toBe(false);
    expect(result.reason).toBe('send_error');
    expect(result.error).toContain('SMTP failure');
  });
});

// ── runDigestJob ──────────────────────────────────────────────────────────────

describe('runDigestJob', () => {
  it('processes all users in notifStore when userIds omitted', async () => {
    const { notifStore, prefStore } = freshStores();

    for (const userId of ['ua', 'ub', 'uc']) {
      const prefs = prefsWithDailyEmail(userId);
      prefStore.set(userId, prefs);
      createNotification(notifStore, {
        userId,
        type:  NOTIFICATION_TYPES.PRICE_DROP,
        title: `Deal for ${userId}`,
      });
    }

    const emailProv = stubEmailProvider();
    const result = await runDigestJob(
      notifStore, prefStore, emailProv, FREQUENCIES.DAILY_DIGEST,
    );

    expect(result.processed).toBe(3);
    expect(result.sent).toBe(3);
    expect(result.skipped).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it('only processes specified userIds when provided', async () => {
    const { notifStore, prefStore } = freshStores();

    for (const userId of ['u1', 'u2', 'u3']) {
      const prefs = prefsWithDailyEmail(userId);
      prefStore.set(userId, prefs);
      createNotification(notifStore, {
        userId,
        type:  NOTIFICATION_TYPES.PRICE_DROP,
        title: `Deal for ${userId}`,
      });
    }

    const emailProv = stubEmailProvider();
    const result = await runDigestJob(
      notifStore, prefStore, emailProv, FREQUENCIES.DAILY_DIGEST, ['u1', 'u3'],
    );

    expect(result.processed).toBe(2);
    expect(result.sent).toBe(2);
    expect(emailProv.sendEmail).toHaveBeenCalledTimes(2);
  });

  it('returns correct sent/skipped counts', async () => {
    const { notifStore, prefStore } = freshStores();

    // u1 has matching notifications
    const prefs1 = prefsWithDailyEmail('u1');
    prefStore.set('u1', prefs1);
    createNotification(notifStore, {
      userId: 'u1',
      type:   NOTIFICATION_TYPES.PRICE_DROP,
      title:  'Deal!',
    });

    // u2 has no notifications in store — processUserDigest will create default prefs
    // and return no_items (notifStore has no entry for u2 either, so getUndigested → [])
    // We need u2 in notifStore to be included in default userIds scan
    notifStore.set('u2', []); // empty list

    const emailProv = stubEmailProvider();
    const result = await runDigestJob(
      notifStore, prefStore, emailProv, FREQUENCIES.DAILY_DIGEST,
    );

    expect(result.sent).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.processed).toBe(2);
  });

  it('records send errors without crashing', async () => {
    const { notifStore, prefStore } = freshStores();
    const prefs = prefsWithDailyEmail('u1');
    prefStore.set('u1', prefs);
    createNotification(notifStore, {
      userId: 'u1',
      type:   NOTIFICATION_TYPES.PRICE_DROP,
      title:  'Deal!',
    });

    const emailProv = {
      sendEmail: vi.fn().mockRejectedValue(new Error('SMTP down')),
    };

    const result = await runDigestJob(
      notifStore, prefStore, emailProv, FREQUENCIES.DAILY_DIGEST, ['u1'],
    );

    expect(result.errors).toHaveLength(1);
    expect(result.sent).toBe(0);
    expect(result.skipped).toBe(0);
  });

  it('returns cadence in result', async () => {
    const { notifStore, prefStore } = freshStores();
    const emailProv = stubEmailProvider();
    const result = await runDigestJob(
      notifStore, prefStore, emailProv, FREQUENCIES.WEEKLY_DIGEST, [],
    );
    expect(result.cadence).toBe(FREQUENCIES.WEEKLY_DIGEST);
  });
});

// ── getUndigested / markDigested (notification-store.js) ──────────────────────

describe('getUndigested', () => {
  it('returns all notifications with digestedAt === null', () => {
    const store = new Map();
    createNotification(store, { userId: 'u1', type: NOTIFICATION_TYPES.PRICE_DROP, title: 'A' });
    createNotification(store, { userId: 'u1', type: NOTIFICATION_TYPES.NEWSLETTER,  title: 'B' });

    const undigested = getUndigested(store, 'u1');
    expect(undigested).toHaveLength(2);
    expect(undigested.every(n => n.digestedAt === null)).toBe(true);
  });

  it('excludes already-digested notifications', () => {
    const store = new Map();
    const n1 = createNotification(store, { userId: 'u1', type: NOTIFICATION_TYPES.PRICE_DROP, title: 'A' });
    createNotification(store, { userId: 'u1', type: NOTIFICATION_TYPES.NEWSLETTER, title: 'B' });

    markDigested(store, 'u1', [n1.id]);

    const undigested = getUndigested(store, 'u1');
    expect(undigested).toHaveLength(1);
    expect(undigested[0].title).toBe('B');
  });

  it('returns empty array for unknown user', () => {
    const store = new Map();
    expect(getUndigested(store, 'nobody')).toEqual([]);
  });
});

describe('markDigested', () => {
  it('stamps digestedAt and returns the count of updated records', () => {
    const store = new Map();
    const n1 = createNotification(store, { userId: 'u1', type: NOTIFICATION_TYPES.PRICE_DROP, title: 'A' });
    const n2 = createNotification(store, { userId: 'u1', type: NOTIFICATION_TYPES.NEWSLETTER,  title: 'B' });

    const count = markDigested(store, 'u1', [n1.id, n2.id]);
    expect(count).toBe(2);

    const all = getNotifications(store, 'u1').notifications;
    expect(all.every(n => n.digestedAt !== null)).toBe(true);
    expect(all[0].digestedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('does not affect other users', () => {
    const store = new Map();
    const n1 = createNotification(store, { userId: 'u1', type: NOTIFICATION_TYPES.PRICE_DROP, title: 'A' });
    createNotification(store, { userId: 'u2', type: NOTIFICATION_TYPES.PRICE_DROP, title: 'B' });

    markDigested(store, 'u1', [n1.id]);

    const u2Notifs = getNotifications(store, 'u2').notifications;
    expect(u2Notifs[0].digestedAt).toBeNull();
  });

  it('returns 0 for unknown user', () => {
    const store = new Map();
    expect(markDigested(store, 'nobody', ['fake-id'])).toBe(0);
  });

  it('returns 0 when ids array is empty', () => {
    const store = new Map();
    createNotification(store, { userId: 'u1', type: NOTIFICATION_TYPES.PRICE_DROP, title: 'A' });
    expect(markDigested(store, 'u1', [])).toBe(0);
  });
});
