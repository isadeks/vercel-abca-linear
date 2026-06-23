/**
 * Tests for api/_lib/notificationsContext.js
 *
 * Covers:
 *   - EMAIL_PREF_GATE / INAPP_PREF_GATE shape
 *   - emailAllowed / inAppAllowed helper logic
 *   - bindInAppFeed + deliver() — both surfaces, preference gating, skipping
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { setPrefs } from '../api/_lib/notify-prefs.js';
import {
  EMAIL_PREF_GATE,
  INAPP_PREF_GATE,
  emailAllowed,
  inAppAllowed,
  bindInAppFeed,
  deliver,
} from '../api/_lib/notificationsContext.js';

// ─── helpers ────────────────────────────────────────────────────────────────

let _uid = 0;
const nextId = () => `ctx-test-user-${++_uid}`;

function makeFeed() {
  let seq = 0;
  const feed = [];
  const generateId = () => `n-test-${++seq}`;
  bindInAppFeed({ feed, generateId });
  return feed;
}

// ─── Gate maps ───────────────────────────────────────────────────────────────

describe('EMAIL_PREF_GATE', () => {
  it('is a non-empty frozen object', () => {
    expect(typeof EMAIL_PREF_GATE).toBe('object');
    expect(Object.keys(EMAIL_PREF_GATE).length).toBeGreaterThan(0);
    expect(() => { EMAIL_PREF_GATE.foo = 'bar'; }).toThrow();
  });

  it('maps booking_confirmation to emailBookingConfirmations', () => {
    expect(EMAIL_PREF_GATE['booking_confirmation']).toBe('emailBookingConfirmations');
  });

  it('maps newsletter to emailNewsletters', () => {
    expect(EMAIL_PREF_GATE['newsletter']).toBe('emailNewsletters');
  });
});

describe('INAPP_PREF_GATE', () => {
  it('is a non-empty frozen object', () => {
    expect(typeof INAPP_PREF_GATE).toBe('object');
    expect(Object.keys(INAPP_PREF_GATE).length).toBeGreaterThan(0);
    expect(() => { INAPP_PREF_GATE.foo = 'bar'; }).toThrow();
  });

  it('maps booking_update to inAppBookingUpdates', () => {
    expect(INAPP_PREF_GATE['booking_update']).toBe('inAppBookingUpdates');
  });

  it('maps system_alert to inAppSystemAlerts', () => {
    expect(INAPP_PREF_GATE['system_alert']).toBe('inAppSystemAlerts');
  });
});

// ─── emailAllowed ────────────────────────────────────────────────────────────

describe('emailAllowed', () => {
  it('returns true when userId is null (no-auth bypass)', () => {
    expect(emailAllowed(null, 'newsletter')).toBe(true);
  });

  it('returns true when userId is undefined', () => {
    expect(emailAllowed(undefined, 'booking_confirmation')).toBe(true);
  });

  it('returns true for an unknown event', () => {
    const id = nextId();
    expect(emailAllowed(id, 'some_unknown_event')).toBe(true);
  });

  it('returns true when the preference key is enabled (default)', () => {
    const id = nextId();
    // emailBookingConfirmations defaults to true
    expect(emailAllowed(id, 'booking_confirmation')).toBe(true);
  });

  it('returns false when the preference key is disabled', () => {
    const id = nextId();
    setPrefs(id, { emailNewsletters: false });
    expect(emailAllowed(id, 'newsletter')).toBe(false);
  });

  it('returns true after re-enabling a preference', () => {
    const id = nextId();
    setPrefs(id, { emailNewsletters: false });
    setPrefs(id, { emailNewsletters: true });
    expect(emailAllowed(id, 'newsletter')).toBe(true);
  });
});

// ─── inAppAllowed ────────────────────────────────────────────────────────────

describe('inAppAllowed', () => {
  it('returns true when userId is null (no-auth bypass)', () => {
    expect(inAppAllowed(null, 'system_alert')).toBe(true);
  });

  it('returns true for an unknown event', () => {
    const id = nextId();
    expect(inAppAllowed(id, 'some_unknown_event')).toBe(true);
  });

  it('returns true when preference key is enabled (default)', () => {
    const id = nextId();
    // inAppBookingUpdates defaults to true
    expect(inAppAllowed(id, 'booking_update')).toBe(true);
  });

  it('returns false when preference key is disabled', () => {
    const id = nextId();
    setPrefs(id, { inAppPromotions: false });
    expect(inAppAllowed(id, 'promotion')).toBe(false);
  });

  it('returns true after re-enabling a preference', () => {
    const id = nextId();
    setPrefs(id, { inAppPromotions: false });
    setPrefs(id, { inAppPromotions: true });
    expect(inAppAllowed(id, 'promotion')).toBe(true);
  });
});

// ─── deliver() ───────────────────────────────────────────────────────────────

describe('deliver — email only', () => {
  beforeEach(() => {
    makeFeed();
  });

  const emailPayload = {
    email: {
      to: 'guest@example.com',
      template: 'booking_confirmation',
      data: {
        guestName: 'Alice',
        destination: 'Santorini',
        bookingRef: 'WND-001',
        checkIn: '2026-07-01',
        checkOut: '2026-07-08',
        guests: 2,
        roomType: 'Suite',
        totalAmount: '$1,000',
      },
    },
  };

  it('queues email when userId is null (bypass)', () => {
    const result = deliver(null, 'booking_confirmation', emailPayload);
    expect(result.emailQueued).toBe(true);
    expect(result.emailSkipped).toBe(false);
    expect(result.emailJob).not.toBeNull();
    expect(result.emailJob.to).toBe('guest@example.com');
  });

  it('queues email when user preference allows it (default)', () => {
    const id = nextId();
    const result = deliver(id, 'booking_confirmation', emailPayload);
    expect(result.emailQueued).toBe(true);
    expect(result.emailSkipped).toBe(false);
  });

  it('skips email when user preference disables it', () => {
    const id = nextId();
    setPrefs(id, { emailBookingConfirmations: false });
    const result = deliver(id, 'booking_confirmation', emailPayload);
    expect(result.emailQueued).toBe(false);
    expect(result.emailSkipped).toBe(true);
    expect(result.emailJob).toBeNull();
  });

  it('does not touch in-app when only email payload given', () => {
    const id = nextId();
    const result = deliver(id, 'booking_confirmation', emailPayload);
    expect(result.inappPushed).toBe(false);
    expect(result.inappSkipped).toBe(false);
  });
});

describe('deliver — in-app only', () => {
  let feed;

  beforeEach(() => {
    feed = makeFeed();
  });

  const inappPayload = {
    inapp: {
      title: 'Booking confirmed',
      body:  'Your Santorini retreat is confirmed.',
      href:  '/santorini-guide.html',
    },
  };

  it('pushes in-app notification when userId is null (bypass)', () => {
    const result = deliver(null, 'booking_confirmation', inappPayload);
    expect(result.inappPushed).toBe(true);
    expect(result.inappSkipped).toBe(false);
    expect(feed[0].title).toBe('Booking confirmed');
    expect(feed[0].href).toBe('/santorini-guide.html');
    expect(feed[0].type).toBe('booking_confirmation');
  });

  it('pushes in-app notification when user preference allows (default)', () => {
    const id = nextId();
    const result = deliver(id, 'booking_confirmation', inappPayload);
    expect(result.inappPushed).toBe(true);
    expect(feed[0].title).toBe('Booking confirmed');
  });

  it('skips in-app notification when preference disables it', () => {
    const id = nextId();
    setPrefs(id, { inAppBookingUpdates: false });
    const initialLen = feed.length;
    const result = deliver(id, 'booking_update', inappPayload);
    expect(result.inappPushed).toBe(false);
    expect(result.inappSkipped).toBe(true);
    expect(feed.length).toBe(initialLen); // nothing added
  });

  it('assigns a type field matching the event', () => {
    deliver(null, 'system_alert', inappPayload);
    expect(feed[0].type).toBe('system_alert');
  });

  it('sets ts to a valid ISO timestamp', () => {
    deliver(null, 'booking_confirmation', inappPayload);
    const ts = new Date(feed[0].ts);
    expect(isNaN(ts.getTime())).toBe(false);
  });

  it('does not touch email when only inapp payload given', () => {
    const result = deliver(null, 'booking_confirmation', inappPayload);
    expect(result.emailQueued).toBe(false);
    expect(result.emailSkipped).toBe(false);
  });
});

describe('deliver — both surfaces', () => {
  let feed;

  beforeEach(() => {
    feed = makeFeed();
  });

  const bothPayloads = {
    email: {
      to: 'guest@example.com',
      template: 'booking_confirmation',
      data: {
        guestName: 'Bob',
        destination: 'Kyoto',
        bookingRef: 'WND-002',
        checkIn: '2026-08-01',
        checkOut: '2026-08-05',
        guests: 1,
        roomType: 'Standard',
        totalAmount: '$600',
      },
    },
    inapp: {
      title: 'Booking confirmed',
      body:  'Your Kyoto booking is confirmed.',
    },
  };

  it('delivers both surfaces when all prefs enabled', () => {
    const result = deliver(null, 'booking_confirmation', bothPayloads);
    expect(result.emailQueued).toBe(true);
    expect(result.inappPushed).toBe(true);
    expect(feed[0].title).toBe('Booking confirmed');
  });

  it('skips email but delivers in-app when email pref disabled', () => {
    const id = nextId();
    setPrefs(id, { emailBookingConfirmations: false });
    const result = deliver(id, 'booking_confirmation', bothPayloads);
    expect(result.emailSkipped).toBe(true);
    expect(result.inappPushed).toBe(true);
  });

  it('delivers email but skips in-app when in-app pref disabled', () => {
    const id = nextId();
    setPrefs(id, { inAppBookingUpdates: false });
    // booking_confirmation maps to inAppBookingUpdates for in-app
    const result = deliver(id, 'booking_confirmation', bothPayloads);
    expect(result.emailQueued).toBe(true);
    expect(result.inappSkipped).toBe(true);
  });

  it('skips both surfaces when all prefs disabled', () => {
    const id = nextId();
    setPrefs(id, { emailBookingConfirmations: false, inAppBookingUpdates: false });
    const result = deliver(id, 'booking_confirmation', bothPayloads);
    expect(result.emailSkipped).toBe(true);
    expect(result.inappSkipped).toBe(true);
  });
});

describe('deliver — no payloads', () => {
  it('returns all-false result when no payloads given', () => {
    const result = deliver(null, 'booking_confirmation');
    expect(result.emailQueued).toBe(false);
    expect(result.emailSkipped).toBe(false);
    expect(result.inappPushed).toBe(false);
    expect(result.inappSkipped).toBe(false);
    expect(result.emailJob).toBeNull();
  });
});
