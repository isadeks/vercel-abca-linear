/**
 * notificationsContext.js — server-side notifications context provider
 *
 * Wires the three notification surfaces together through a single module:
 *   • Email  — queued via emailQueue using rendered templates
 *   • In-app — written into the feed owned by api/notify/inapp.js
 *   • Prefs  — read via notify-prefs to gate delivery on both surfaces
 *
 * Endpoints (`api/notify/email.js`, `api/notify/inapp.js`) import the gate
 * helpers (`emailAllowed`, `inAppAllowed`) to enforce preference checks before
 * processing their own payloads.
 *
 * The unified `deliver()` function is the single entry-point when a caller
 * wants to route one event to every permitted surface in one call (e.g. a
 * booking engine that triggers both an email AND an in-app notification).
 *
 * In-app feed binding
 * -------------------
 * `api/notify/inapp.js` calls `bindInAppFeed({ feed, generateId })` at module
 * load time so `deliver()` can write directly into the live feed array.
 * If no feed has been bound (tests, or when inapp.js is not loaded in the
 * same process), the in-app surface is silently skipped inside `deliver()`.
 *
 * Usage
 * -----
 *   import { emailAllowed, inAppAllowed } from './notificationsContext.js';
 *   if (emailAllowed(userId, 'newsletter')) { ... }
 *
 *   import { notificationsContext } from './notificationsContext.js';
 *   notificationsContext.deliver(userId, 'booking_confirmation', {
 *     email: { to: 'guest@example.com', template: 'booking_confirmation', data: {...} },
 *     inapp: { title: 'Booking confirmed', body: '...' },
 *   });
 */

import { getPrefs } from './notify-prefs.js';
import { renderTemplate } from './email-templates.js';
import { emailQueue } from './email-queue.js';

// ---------------------------------------------------------------------------
// Preference gate maps
// ---------------------------------------------------------------------------

/**
 * Maps a notification event name to the preference key that must be `true`
 * before an email is dispatched.
 * Events absent from this map are unconditionally permitted.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const EMAIL_PREF_GATE = Object.freeze({
  booking_confirmation: 'emailBookingConfirmations',
  booking_cancellation: 'emailBookingConfirmations',
  booking_reminder:     'emailBookingConfirmations',
  newsletter:           'emailNewsletters',
  marketing:            'emailMarketing',
});

/**
 * Maps a notification event name to the preference key that must be `true`
 * before an in-app notification is stored.
 * Events absent from this map are unconditionally permitted.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const INAPP_PREF_GATE = Object.freeze({
  booking_update:       'inAppBookingUpdates',
  booking_confirmation: 'inAppBookingUpdates',
  booking_cancellation: 'inAppBookingUpdates',
  booking_reminder:     'inAppBookingUpdates',
  system_alert:         'inAppSystemAlerts',
  promotion:            'inAppPromotions',
});

// ---------------------------------------------------------------------------
// Gate helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if user preferences permit emailing this event.
 * Permissive (returns true) when userId is absent — no-auth / server-to-server
 * calls bypass preference checks.
 *
 * @param {string | null | undefined} userId
 * @param {string} event
 * @returns {boolean}
 */
export function emailAllowed(userId, event) {
  if (!userId) return true;
  const key = EMAIL_PREF_GATE[event];
  if (!key) return true; // unknown event — allow by default
  return Boolean(getPrefs(String(userId))[key]);
}

/**
 * Returns true if user preferences permit storing this in-app notification.
 * Permissive when userId is absent.
 *
 * @param {string | null | undefined} userId
 * @param {string} event
 * @returns {boolean}
 */
export function inAppAllowed(userId, event) {
  if (!userId) return true;
  const key = INAPP_PREF_GATE[event];
  if (!key) return true; // unknown event — allow by default
  return Boolean(getPrefs(String(userId))[key]);
}

// ---------------------------------------------------------------------------
// In-app feed registry
// ---------------------------------------------------------------------------

/**
 * @typedef {{ id: string, title: string, body: string, href?: string, ts: string, type?: string }} InAppNotification
 */

/**
 * @typedef {{ feed: InAppNotification[], generateId: () => string }} InAppRegistry
 */

/** @type {InAppRegistry | null} */
let _inappRegistry = null;

/**
 * Register the live in-app feed owned by `api/notify/inapp.js`.
 *
 * Call once at module-load time from `inapp.js`:
 *   bindInAppFeed({ feed, generateId });
 *
 * This lets `deliver()` write into the same in-memory array that
 * GET /api/notify/inapp reads, without creating a circular import.
 *
 * @param {InAppRegistry} registry
 */
export function bindInAppFeed(registry) {
  _inappRegistry = registry;
}

// ---------------------------------------------------------------------------
// Unified delivery
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} EmailPayload
 * @property {string} to
 * @property {string} template
 * @property {Record<string, unknown>} data
 */

/**
 * @typedef {Object} InAppPayload
 * @property {string} title
 * @property {string} body
 * @property {string} [href]
 */

/**
 * @typedef {Object} DeliverResult
 * @property {boolean} emailQueued    true when an email job was enqueued.
 * @property {boolean} emailSkipped   true when user prefs blocked email delivery.
 * @property {import('./email-queue.js').EmailJob | null} emailJob
 * @property {boolean} inappPushed    true when the notification was stored in the feed.
 * @property {boolean} inappSkipped   true when user prefs blocked in-app delivery.
 */

/**
 * Route one notification event to every surface the user's preferences permit.
 *
 * Each payload key (`email`, `inapp`) is optional — omit either to skip that
 * surface entirely regardless of preferences.
 *
 * @param {string | null | undefined} userId
 * @param {string} event   Notification event name (e.g. 'booking_confirmation').
 * @param {{ email?: EmailPayload, inapp?: InAppPayload }} [payloads]
 * @returns {DeliverResult}
 */
export function deliver(userId, event, payloads = {}) {
  /** @type {DeliverResult} */
  const result = {
    emailQueued:  false,
    emailSkipped: false,
    emailJob:     null,
    inappPushed:  false,
    inappSkipped: false,
  };

  // ── Email surface ──────────────────────────────────────────────────────────
  if (payloads.email) {
    if (emailAllowed(userId, event)) {
      const { to, template, data } = payloads.email;
      const rendered = renderTemplate(template, data);
      result.emailJob = emailQueue.enqueue({
        to,
        subject: rendered.subject,
        html:    rendered.html,
        text:    rendered.text,
      });
      result.emailQueued = true;
    } else {
      result.emailSkipped = true;
    }
  }

  // ── In-app surface ─────────────────────────────────────────────────────────
  if (payloads.inapp) {
    if (inAppAllowed(userId, event)) {
      const { title, body, href } = payloads.inapp;
      /** @type {InAppNotification} */
      const notification = {
        id:    _inappRegistry ? _inappRegistry.generateId() : `n-ctx-${Date.now()}`,
        title,
        body,
        ts:    new Date().toISOString(),
        type:  event,
      };
      if (href) notification.href = href;
      if (_inappRegistry) {
        _inappRegistry.feed.unshift(notification);
      }
      result.inappPushed = true;
    } else {
      result.inappSkipped = true;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

/**
 * Module-level singleton — import in endpoint handlers and app code:
 *   import { notificationsContext } from './notificationsContext.js';
 */
export const notificationsContext = {
  emailAllowed,
  inAppAllowed,
  deliver,
  bindInAppFeed,
  EMAIL_PREF_GATE,
  INAPP_PREF_GATE,
};
