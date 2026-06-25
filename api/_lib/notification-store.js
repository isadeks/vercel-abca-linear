/**
 * notification-store.js — in-app notification domain logic.
 *
 * Framework-free ES module; consumed by api/notifications.js.
 *
 * Data model
 * ----------
 * A Notification record has the shape:
 *
 *   {
 *     id:        string,       // unique opaque id
 *     userId:    string,
 *     type:      string,       // one of NOTIFICATION_TYPES values
 *     title:     string,       // short summary line
 *     body:      string,       // longer detail (may be empty)
 *     read:      boolean,
 *     createdAt: string,       // ISO-8601
 *     readAt:    string|null   // ISO-8601 or null
 *   }
 *
 * The store parameter accepted by all functions is a plain `Map<string,
 * Notification[]>` keyed by userId — callers own the Map instance so that
 * tests can pass a fresh map and the API handler can keep a module-level one.
 */

import { NOTIFICATION_TYPES } from './notifications.js';

// ── ID generation ─────────────────────────────────────────────────────────────
let _seq = 0;

/** @returns {string} */
function generateId() {
  return `notif_${Date.now()}_${(++_seq).toString(36)}`;
}

// ── Factory ───────────────────────────────────────────────────────────────────

/**
 * Create a new in-app notification and prepend it to the user's list.
 *
 * Returns `null` (without mutating the store) when:
 *   - `type` is not a known NOTIFICATION_TYPE, or
 *   - `userPrefs` is provided and `userPrefs.types[type].enabled === false`
 *
 * @param {Map<string, object[]>}                                store
 * @param {{ userId: string, type: string, title: string, body?: string }} params
 * @param {import('./notifications.js').UserPreferences|null}   [userPrefs]
 * @returns {object|null}
 */
export function createNotification(store, { userId, type, title, body = '' }, userPrefs = null) {
  if (!userId || typeof userId !== 'string') {
    throw new Error('userId must be a non-empty string');
  }

  if (!Object.values(NOTIFICATION_TYPES).includes(type)) {
    return null;
  }

  // Respect per-type enabled flag from the user's preference record
  if (userPrefs?.types?.[type]?.enabled === false) {
    return null;
  }

  const notification = {
    id:        generateId(),
    userId,
    type,
    title:     String(title ?? ''),
    body:      String(body ?? ''),
    read:      false,
    createdAt: new Date().toISOString(),
    readAt:    null,
  };

  const list = store.get(userId) ?? [];
  store.set(userId, [notification, ...list]);
  return notification;
}

// ── Queries ───────────────────────────────────────────────────────────────────

/**
 * Return all notifications for a user (newest first) plus the unread count.
 *
 * @param {Map<string, object[]>} store
 * @param {string}                userId
 * @returns {{ notifications: object[], unreadCount: number }}
 */
export function getNotifications(store, userId) {
  const notifications = store.get(userId) ?? [];
  const unreadCount   = notifications.filter(n => !n.read).length;
  return { notifications, unreadCount };
}

// ── Mutations ─────────────────────────────────────────────────────────────────

/**
 * Mark a single notification as read.
 * Returns the updated notification, or `null` if the id was not found.
 *
 * @param {Map<string, object[]>} store
 * @param {string}                userId
 * @param {string}                notificationId
 * @returns {object|null}
 */
export function markRead(store, userId, notificationId) {
  const list = store.get(userId);
  if (!list) return null;

  const now = new Date().toISOString();
  let found = null;

  const updated = list.map(n => {
    if (n.id !== notificationId) return n;
    found = { ...n, read: true, readAt: n.readAt ?? now };
    return found;
  });

  if (!found) return null;
  store.set(userId, updated);
  return found;
}

/**
 * Mark every unread notification for a user as read.
 * Returns the number of notifications that were updated.
 *
 * @param {Map<string, object[]>} store
 * @param {string}                userId
 * @returns {number}
 */
export function markAllRead(store, userId) {
  const list = store.get(userId);
  if (!list) return 0;

  const now = new Date().toISOString();
  let count = 0;

  const updated = list.map(n => {
    if (n.read) return n;
    count++;
    return { ...n, read: true, readAt: now };
  });

  store.set(userId, updated);
  return count;
}

/**
 * Delete all notifications for a user.
 * Returns the number of records deleted.
 *
 * @param {Map<string, object[]>} store
 * @param {string}                userId
 * @returns {number}
 */
export function clearAll(store, userId) {
  const count = (store.get(userId) ?? []).length;
  store.delete(userId);
  return count;
}
