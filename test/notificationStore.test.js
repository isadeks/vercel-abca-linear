import { describe, it, expect, beforeEach } from 'vitest';
import { createNotificationStore } from '../api/_lib/notificationStore.js';

/** In-memory localStorage substitute for testing. */
function makeStorage() {
  const data = {};
  return {
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => { data[k] = v; },
    _data: data,
  };
}

const N1 = { id: 'a', title: 'Hello', body: 'World', ts: '2026-06-01T10:00:00.000Z' };
const N2 = { id: 'b', title: 'Kyoto', body: 'Your booking is confirmed', ts: '2026-06-02T12:00:00.000Z' };
const N3 = { id: 'c', title: 'Alert', body: 'Rooms filling up', ts: '2026-06-03T08:00:00.000Z' };

describe('createNotificationStore', () => {
  let store;
  let storage;

  beforeEach(() => {
    storage = makeStorage();
    store = createNotificationStore({ storage });
  });

  // ── Initial state ──────────────────────────────────────────────────────────
  it('starts with an empty feed', () => {
    expect(store.getAll()).toEqual([]);
    expect(store.unreadCount()).toBe(0);
  });

  // ── setNotifications ───────────────────────────────────────────────────────
  it('setNotifications replaces the feed', () => {
    store.setNotifications([N1, N2]);
    expect(store.getAll()).toHaveLength(2);
  });

  it('getAll returns notifications newest-first', () => {
    store.setNotifications([N1, N2, N3]);
    const ids = store.getAll().map(n => n.id);
    expect(ids).toEqual(['c', 'b', 'a']);
  });

  // ── mergeNotifications ─────────────────────────────────────────────────────
  it('mergeNotifications appends only new items', () => {
    store.setNotifications([N1]);
    store.mergeNotifications([N1, N2]); // N1 is a dupe
    expect(store.getAll()).toHaveLength(2);
  });

  it('mergeNotifications does nothing when all are dupes', () => {
    store.setNotifications([N1, N2]);
    store.mergeNotifications([N1, N2]);
    expect(store.getAll()).toHaveLength(2);
  });

  // ── read / unread ──────────────────────────────────────────────────────────
  it('all notifications start as unread', () => {
    store.setNotifications([N1, N2]);
    expect(store.unreadCount()).toBe(2);
    expect(store.getUnread()).toHaveLength(2);
    expect(store.getRead()).toHaveLength(0);
  });

  it('markRead moves a notification to read', () => {
    store.setNotifications([N1, N2]);
    store.markRead('a');
    expect(store.isRead('a')).toBe(true);
    expect(store.unreadCount()).toBe(1);
    expect(store.getUnread().map(n => n.id)).toEqual(['b']);
    expect(store.getRead().map(n => n.id)).toEqual(['a']);
  });

  it('markRead is idempotent', () => {
    store.setNotifications([N1]);
    store.markRead('a');
    store.markRead('a');
    expect(store.unreadCount()).toBe(0);
  });

  it('markAllRead marks every notification', () => {
    store.setNotifications([N1, N2, N3]);
    store.markAllRead();
    expect(store.unreadCount()).toBe(0);
    expect(store.getRead()).toHaveLength(3);
  });

  it('markUnread restores an item to unread', () => {
    store.setNotifications([N1]);
    store.markRead('a');
    store.markUnread('a');
    expect(store.isRead('a')).toBe(false);
    expect(store.unreadCount()).toBe(1);
  });

  it('isRead returns false for unknown id', () => {
    expect(store.isRead('unknown')).toBe(false);
  });

  // ── persistence ───────────────────────────────────────────────────────────
  it('persists read ids to storage after markRead', () => {
    store.setNotifications([N1, N2]);
    store.markRead('a');
    const stored = JSON.parse(storage.getItem('wander:notifications:read'));
    expect(stored).toContain('a');
  });

  it('rehydrates read ids from storage on creation', () => {
    storage.setItem('wander:notifications:read', JSON.stringify(['b']));
    const store2 = createNotificationStore({ storage });
    store2.setNotifications([N1, N2]);
    expect(store2.isRead('b')).toBe(true);
    expect(store2.isRead('a')).toBe(false);
    expect(store2.unreadCount()).toBe(1);
  });

  // ── subscribe ──────────────────────────────────────────────────────────────
  it('subscribe fires on setNotifications', () => {
    let calls = 0;
    store.subscribe(() => calls++);
    store.setNotifications([N1]);
    expect(calls).toBe(1);
  });

  it('subscribe fires on markRead', () => {
    store.setNotifications([N1]);
    let calls = 0;
    store.subscribe(() => calls++);
    store.markRead('a');
    expect(calls).toBe(1);
  });

  it('subscribe does NOT fire when markRead is a no-op (already read)', () => {
    store.setNotifications([N1]);
    store.markRead('a');
    let calls = 0;
    store.subscribe(() => calls++);
    store.markRead('a'); // already read
    expect(calls).toBe(0);
  });

  it('unsubscribe stops further notifications', () => {
    let calls = 0;
    const unsub = store.subscribe(() => calls++);
    store.setNotifications([N1]);
    unsub();
    store.setNotifications([N2]);
    expect(calls).toBe(1);
  });

  it('mergeNotifications fires subscriber only when there are new items', () => {
    store.setNotifications([N1]);
    let calls = 0;
    store.subscribe(() => calls++);
    store.mergeNotifications([N1]); // dupe — no change
    expect(calls).toBe(0);
    store.mergeNotifications([N2]); // new item
    expect(calls).toBe(1);
  });
});
