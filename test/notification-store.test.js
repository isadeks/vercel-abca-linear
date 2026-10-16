import { describe, it, expect } from 'vitest';
import {
  createNotification,
  getNotifications,
  markRead,
  markAllRead,
  clearAll,
} from '../api/_lib/notification-store.js';
import { NOTIFICATION_TYPES, createPreferences, updatePreferences } from '../api/_lib/notifications.js';

// ── helpers ───────────────────────────────────────────────────────────────────

function freshStore() {
  return new Map();
}

function seedOne(store, userId, overrides = {}) {
  return createNotification(
    store,
    {
      userId,
      type:  overrides.type  ?? NOTIFICATION_TYPES.BOOKING_CONFIRMATION,
      title: overrides.title ?? 'Your booking is confirmed',
      body:  overrides.body  ?? 'Details inside.',
    },
    overrides.prefs ?? null,
  );
}

// ── createNotification ────────────────────────────────────────────────────────

describe('createNotification', () => {
  it('creates a notification and returns it', () => {
    const store = freshStore();
    const n = seedOne(store, 'u1');
    expect(n).not.toBeNull();
    expect(n.userId).toBe('u1');
    expect(n.type).toBe(NOTIFICATION_TYPES.BOOKING_CONFIRMATION);
    expect(n.read).toBe(false);
    expect(n.readAt).toBeNull();
    expect(n.id).toMatch(/^notif_/);
    expect(n.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('prepends new notifications (newest first)', () => {
    const store = freshStore();
    const first  = seedOne(store, 'u2', { title: 'first'  });
    const second = seedOne(store, 'u2', { title: 'second' });
    const { notifications } = getNotifications(store, 'u2');
    expect(notifications[0].id).toBe(second.id);
    expect(notifications[1].id).toBe(first.id);
  });

  it('returns null for an unknown notification type', () => {
    const store = freshStore();
    const n = createNotification(store, { userId: 'u3', type: 'ghost_type', title: 'hi' });
    expect(n).toBeNull();
  });

  it('returns null when user prefs have the type disabled', () => {
    const store = freshStore();
    const prefs = updatePreferences(
      createPreferences('u4'),
      { types: { [NOTIFICATION_TYPES.NEWSLETTER]: { enabled: false } } },
    );
    const n = createNotification(
      store,
      { userId: 'u4', type: NOTIFICATION_TYPES.NEWSLETTER, title: 'Weekly picks' },
      prefs,
    );
    expect(n).toBeNull();
  });

  it('creates notification when prefs have the type enabled', () => {
    const store = freshStore();
    const prefs = createPreferences('u5');
    const n = createNotification(
      store,
      { userId: 'u5', type: NOTIFICATION_TYPES.BOOKING_CONFIRMATION, title: 'Booked!' },
      prefs,
    );
    expect(n).not.toBeNull();
  });

  it('throws when userId is missing', () => {
    const store = freshStore();
    expect(() =>
      createNotification(store, { userId: '', type: NOTIFICATION_TYPES.BOOKING_CONFIRMATION, title: 'x' }),
    ).toThrow();
  });

  it('defaults body to empty string when omitted', () => {
    const store = freshStore();
    const n = createNotification(store, { userId: 'u6', type: NOTIFICATION_TYPES.PRICE_DROP, title: 'Drop!' });
    expect(n.body).toBe('');
  });
});

// ── getNotifications ──────────────────────────────────────────────────────────

describe('getNotifications', () => {
  it('returns empty list and zero unread for unknown user', () => {
    const { notifications, unreadCount } = getNotifications(freshStore(), 'nobody');
    expect(notifications).toEqual([]);
    expect(unreadCount).toBe(0);
  });

  it('counts only unread notifications', () => {
    const store = freshStore();
    const n1 = seedOne(store, 'u7');
    const n2 = seedOne(store, 'u7', { type: NOTIFICATION_TYPES.PRICE_DROP, title: 'Price drop' });
    markRead(store, 'u7', n1.id);
    const { unreadCount } = getNotifications(store, 'u7');
    // n2 is still unread; n1 was just marked read
    expect(unreadCount).toBe(1);
    void n2;
  });
});

// ── markRead ──────────────────────────────────────────────────────────────────

describe('markRead', () => {
  it('marks a notification as read and stamps readAt', () => {
    const store = freshStore();
    const n = seedOne(store, 'u8');
    const updated = markRead(store, 'u8', n.id);
    expect(updated.read).toBe(true);
    expect(updated.readAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('returns null for a non-existent notification id', () => {
    const store = freshStore();
    seedOne(store, 'u9');
    expect(markRead(store, 'u9', 'no-such-id')).toBeNull();
  });

  it('returns null for an unknown user', () => {
    const store = freshStore();
    expect(markRead(store, 'ghost', 'any-id')).toBeNull();
  });

  it('does not clobber readAt if already set', () => {
    const store = freshStore();
    const n = seedOne(store, 'u10');
    const first  = markRead(store, 'u10', n.id);
    const second = markRead(store, 'u10', n.id);
    expect(second.readAt).toBe(first.readAt);
  });

  it('does not mutate other notifications', () => {
    const store = freshStore();
    const n1 = seedOne(store, 'u11', { type: NOTIFICATION_TYPES.BOOKING_CONFIRMATION, title: 'A' });
    const n2 = seedOne(store, 'u11', { type: NOTIFICATION_TYPES.PRICE_DROP,           title: 'B' });
    markRead(store, 'u11', n1.id);
    const { notifications } = getNotifications(store, 'u11');
    const remaining = notifications.find(n => n.id === n2.id);
    expect(remaining.read).toBe(false);
  });
});

// ── markAllRead ───────────────────────────────────────────────────────────────

describe('markAllRead', () => {
  it('marks all unread notifications as read', () => {
    const store = freshStore();
    seedOne(store, 'u12', { type: NOTIFICATION_TYPES.BOOKING_CONFIRMATION, title: 'A' });
    seedOne(store, 'u12', { type: NOTIFICATION_TYPES.PRICE_DROP,           title: 'B' });
    seedOne(store, 'u12', { type: NOTIFICATION_TYPES.NEWSLETTER,           title: 'C' });
    const count = markAllRead(store, 'u12');
    expect(count).toBe(3);
    const { unreadCount } = getNotifications(store, 'u12');
    expect(unreadCount).toBe(0);
  });

  it('returns 0 for an unknown user', () => {
    expect(markAllRead(freshStore(), 'nobody')).toBe(0);
  });

  it('only counts previously-unread items', () => {
    const store = freshStore();
    const n1 = seedOne(store, 'u13', { type: NOTIFICATION_TYPES.BOOKING_CONFIRMATION, title: 'A' });
    seedOne(store, 'u13', { type: NOTIFICATION_TYPES.PRICE_DROP, title: 'B' });
    markRead(store, 'u13', n1.id); // manually mark one first
    const count = markAllRead(store, 'u13');
    expect(count).toBe(1); // only the second was still unread
  });
});

// ── clearAll ──────────────────────────────────────────────────────────────────

describe('clearAll', () => {
  it('removes all notifications and returns the count', () => {
    const store = freshStore();
    seedOne(store, 'u14', { type: NOTIFICATION_TYPES.BOOKING_CONFIRMATION, title: 'A' });
    seedOne(store, 'u14', { type: NOTIFICATION_TYPES.PRICE_DROP,           title: 'B' });
    const deleted = clearAll(store, 'u14');
    expect(deleted).toBe(2);
    expect(getNotifications(store, 'u14').notifications).toEqual([]);
  });

  it('returns 0 for an unknown user', () => {
    expect(clearAll(freshStore(), 'nobody')).toBe(0);
  });

  it('does not affect other users', () => {
    const store = freshStore();
    seedOne(store, 'u15', { title: 'mine' });
    seedOne(store, 'u16', { title: 'theirs' });
    clearAll(store, 'u15');
    expect(getNotifications(store, 'u16').notifications).toHaveLength(1);
  });
});
