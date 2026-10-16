/**
 * notificationStore.js
 *
 * Client-side read/unread state store for in-app notifications.
 *
 * Design:
 *  - Notifications are plain objects: { id, title, body, href, ts }
 *  - "Read" IDs are persisted in localStorage under STORAGE_KEY so they
 *    survive page reloads.  When localStorage is absent (SSR, tests) the
 *    store falls back to an in-memory Set.
 *  - The store is intentionally framework-free — it works as-is in a browser
 *    module script and is unit-tested with Vitest (Node) via the in-memory path.
 */

const STORAGE_KEY = 'wander:notifications:read';

/**
 * @typedef {{ id: string, title: string, body: string, href?: string, ts: string }} Notification
 */

/**
 * createNotificationStore
 *
 * Factory that returns a new store instance.  Pass an optional `storage`
 * object (must implement getItem/setItem) to override localStorage — useful
 * in tests.
 *
 * @param {{ storage?: { getItem(k: string): string|null, setItem(k: string, v: string): void } }} [opts]
 */
export function createNotificationStore(opts = {}) {
  const storage = opts.storage ?? globalThis.localStorage ?? null;

  /** @type {Notification[]} */
  let notifications = [];

  /** @type {Set<string>} */
  const readIds = (() => {
    try {
      const raw = storage?.getItem(STORAGE_KEY);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  })();

  /** @type {Array<() => void>} */
  const listeners = [];

  function persist() {
    try {
      storage?.setItem(STORAGE_KEY, JSON.stringify([...readIds]));
    } catch {
      // best effort
    }
  }

  function notify() {
    listeners.forEach(fn => fn());
  }

  return {
    /**
     * Replace the full notifications list (e.g. after a fresh fetch).
     * @param {Notification[]} items
     */
    setNotifications(items) {
      notifications = [...items];
      notify();
    },

    /**
     * Append new notifications that are not already in the list.
     * @param {Notification[]} items
     */
    mergeNotifications(items) {
      const existingIds = new Set(notifications.map(n => n.id));
      const fresh = items.filter(n => !existingIds.has(n.id));
      if (fresh.length > 0) {
        notifications = [...notifications, ...fresh];
        notify();
      }
    },

    /** @returns {Notification[]} all notifications, newest-first */
    getAll() {
      return [...notifications].sort((a, b) => (a.ts < b.ts ? 1 : -1));
    },

    /** @returns {Notification[]} only unread notifications */
    getUnread() {
      return this.getAll().filter(n => !readIds.has(n.id));
    },

    /** @returns {Notification[]} only read notifications */
    getRead() {
      return this.getAll().filter(n => readIds.has(n.id));
    },

    /** @returns {number} count of unread notifications */
    unreadCount() {
      return notifications.filter(n => !readIds.has(n.id)).length;
    },

    /**
     * Mark a single notification as read.
     * @param {string} id
     */
    markRead(id) {
      if (!readIds.has(id)) {
        readIds.add(id);
        persist();
        notify();
      }
    },

    /** Mark all notifications as read. */
    markAllRead() {
      let changed = false;
      notifications.forEach(n => {
        if (!readIds.has(n.id)) {
          readIds.add(n.id);
          changed = true;
        }
      });
      if (changed) {
        persist();
        notify();
      }
    },

    /**
     * Mark a single notification as unread.
     * @param {string} id
     */
    markUnread(id) {
      if (readIds.has(id)) {
        readIds.delete(id);
        persist();
        notify();
      }
    },

    /**
     * Returns true if the given notification id has been read.
     * @param {string} id
     * @returns {boolean}
     */
    isRead(id) {
      return readIds.has(id);
    },

    /**
     * Subscribe to store changes.  Returns an unsubscribe function.
     * @param {() => void} listener
     * @returns {() => void}
     */
    subscribe(listener) {
      listeners.push(listener);
      return () => {
        const idx = listeners.indexOf(listener);
        if (idx !== -1) listeners.splice(idx, 1);
      };
    },
  };
}

// Convenience singleton for browser usage.
export const notificationStore = createNotificationStore();
