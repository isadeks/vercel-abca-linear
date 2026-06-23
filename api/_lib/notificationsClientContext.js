/**
 * notificationsClientContext.js — shared browser-side notifications context
 *
 * Provides a single, shareable state container that both the notification bell
 * component (`notificationBell.js`) and the notification preferences settings
 * page (`notification-preferences.html`) can bind to so they always reflect
 * the same user identity and preference values.
 *
 * Design
 * ──────
 * The context is a plain singleton object with a lightweight publish/subscribe
 * mechanism — no framework required.  Browser pages import (or inline-import)
 * this module, then:
 *
 *   1. Set a userId when the user logs in / enters their ID:
 *        ctx.setUserId('alice');
 *
 *   2. Subscribe to changes:
 *        ctx.subscribe(() => { ... });
 *
 *   3. Fetch latest prefs from the API (returns a Promise):
 *        await ctx.loadPrefs();
 *
 *   4. Save prefs back:
 *        await ctx.savePrefs({ emailNewsletters: true });
 *
 *   5. Mount the bell, passing the shared context for consistent state:
 *        import { mountNotificationBell } from './notificationBell.js';
 *        mountNotificationBell(slot, { clientContext: ctx });
 *
 * The bell component reads `ctx.userId` and `ctx.prefs.inAppXxx` to decide
 * whether to suppress the badge / poll when in-app notifications are disabled.
 *
 * Preference keys (mirrors DEFAULTS in notify-prefs.js)
 * ──────────────────────────────────────────────────────
 *   emailBookingConfirmations  boolean
 *   emailNewsletters           boolean
 *   emailMarketing             boolean
 *   inAppBookingUpdates        boolean
 *   inAppSystemAlerts          boolean
 *   inAppPromotions            boolean
 */

const PREFS_API = '/api/notify/prefs';

/**
 * @typedef {Object} NotificationPrefs
 * @property {boolean} emailBookingConfirmations
 * @property {boolean} emailNewsletters
 * @property {boolean} emailMarketing
 * @property {boolean} inAppBookingUpdates
 * @property {boolean} inAppSystemAlerts
 * @property {boolean} inAppPromotions
 */

/** @type {NotificationPrefs} */
const DEFAULT_PREFS = {
  emailBookingConfirmations: true,
  emailNewsletters:          false,
  emailMarketing:            false,
  inAppBookingUpdates:       true,
  inAppSystemAlerts:         true,
  inAppPromotions:           false,
};

/**
 * Creates a new notifications client context instance.
 *
 * Normally one singleton (see bottom of file) is used per page, but the
 * factory is exported so tests can create isolated instances.
 *
 * @param {{ prefsApiBase?: string }} [opts]
 */
export function createNotificationsClientContext(opts = {}) {
  const prefsApiBase = opts.prefsApiBase ?? PREFS_API;

  /** @type {string | null} */
  let _userId = null;

  /** @type {NotificationPrefs} */
  let _prefs = { ...DEFAULT_PREFS };

  /** @type {Array<() => void>} */
  const _listeners = [];

  function _notify() {
    _listeners.forEach(fn => fn());
  }

  return {
    // ── User identity ─────────────────────────────────────────────────────────

    /**
     * Returns the current user ID (null if not set).
     * @returns {string | null}
     */
    get userId() { return _userId; },

    /**
     * Set the active user ID.  Clears any previously loaded prefs (they may
     * belong to a different user).  Does not automatically fetch prefs — call
     * `loadPrefs()` afterwards if needed.
     *
     * @param {string | null} id
     */
    setUserId(id) {
      const next = id ? String(id).trim() || null : null;
      if (next !== _userId) {
        _userId = next;
        _prefs = { ...DEFAULT_PREFS };
        _notify();
      }
    },

    // ── Preferences ───────────────────────────────────────────────────────────

    /**
     * Returns a snapshot of the current preferences.
     * @returns {NotificationPrefs}
     */
    get prefs() { return { ..._prefs }; },

    /**
     * Fetch the current user's preferences from the API and store them locally.
     * No-op when userId is null; returns the current prefs snapshot.
     *
     * @returns {Promise<NotificationPrefs>}
     */
    async loadPrefs() {
      if (!_userId) return { ..._prefs };
      const res  = await fetch(`${prefsApiBase}?userId=${encodeURIComponent(_userId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load preferences');
      _prefs = { ...DEFAULT_PREFS, ...data.prefs };
      _notify();
      return { ..._prefs };
    },

    /**
     * Merge `updates` into local prefs and persist them to the API.
     * Throws when userId is null or the API returns an error.
     *
     * @param {Partial<NotificationPrefs>} updates
     * @returns {Promise<NotificationPrefs>}
     */
    async savePrefs(updates) {
      if (!_userId) throw new Error('Cannot save preferences without a userId');
      const res  = await fetch(prefsApiBase, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ userId: _userId, ...updates }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to save preferences');
      _prefs = { ...DEFAULT_PREFS, ...data.prefs };
      _notify();
      return { ..._prefs };
    },

    /**
     * Reset preferences to server defaults and update local state.
     * Throws when userId is null or the API returns an error.
     *
     * @returns {Promise<NotificationPrefs>}
     */
    async resetPrefs() {
      if (!_userId) throw new Error('Cannot reset preferences without a userId');
      const res  = await fetch(`${prefsApiBase}?userId=${encodeURIComponent(_userId)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to reset preferences');
      _prefs = { ...DEFAULT_PREFS, ...data.prefs };
      _notify();
      return { ..._prefs };
    },

    /**
     * Apply a prefs snapshot directly (e.g. from a server render or initial
     * page data) without making a network request.
     *
     * @param {Partial<NotificationPrefs>} snapshot
     */
    applyPrefs(snapshot) {
      _prefs = { ...DEFAULT_PREFS, ...snapshot };
      _notify();
    },

    // ── Subscription ──────────────────────────────────────────────────────────

    /**
     * Subscribe to any state change (userId or prefs).
     * Returns an unsubscribe function.
     *
     * @param {() => void} listener
     * @returns {() => void}
     */
    subscribe(listener) {
      _listeners.push(listener);
      return () => {
        const idx = _listeners.indexOf(listener);
        if (idx !== -1) _listeners.splice(idx, 1);
      };
    },
  };
}

// ---------------------------------------------------------------------------
// Module-level singleton for browser page usage
// ---------------------------------------------------------------------------

/**
 * Shared browser-side context.  Import this on any page that needs consistent
 * notification bell + settings-page state.
 *
 * @type {ReturnType<typeof createNotificationsClientContext>}
 */
export const notificationsClientContext = createNotificationsClientContext();
