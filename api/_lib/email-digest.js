/**
 * email-digest.js — core domain logic for email digest delivery.
 *
 * Framework-free ES module; consumed by api/email-digest.js.
 *
 * Exports
 * -------
 *   DIGEST_CADENCES          - frozen enum: DAILY / WEEKLY
 *   buildDigestPayload()     - filter undigested notifications for a cadence
 *   renderDigestHtml()       - render HTML email body
 *   renderDigestText()       - render plain-text email body
 *   processUserDigest()      - orchestrate digest send for one user
 *   runDigestJob()           - orchestrate digest send for many users
 */

import { FREQUENCIES, createPreferences } from './notifications.js';
import { getUndigested, markDigested }     from './notification-store.js';

// ── Enumerations ──────────────────────────────────────────────────────────────

/** @type {{ DAILY: string, WEEKLY: string }} */
export const DIGEST_CADENCES = Object.freeze({
  DAILY:  FREQUENCIES.DAILY_DIGEST,
  WEEKLY: FREQUENCIES.WEEKLY_DIGEST,
});

/** Valid cadence values (set for O(1) lookup). */
const VALID_CADENCES = new Set([FREQUENCIES.DAILY_DIGEST, FREQUENCIES.WEEKLY_DIGEST]);

// ── HTML helpers ──────────────────────────────────────────────────────────────

/**
 * Escape HTML special characters so user-supplied strings are safe to embed.
 *
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Return the human-readable label for a cadence value.
 *
 * @param {string} cadence
 * @returns {string}
 */
function cadenceLabel(cadence) {
  return cadence === FREQUENCIES.DAILY_DIGEST ? 'Daily' : 'Weekly';
}

// ── buildDigestPayload ────────────────────────────────────────────────────────

/**
 * Filter `notifications` down to those that should be included in an email
 * digest of the given `cadence`.
 *
 * Filtering rules:
 *   1. User must have `channels.email === true`
 *   2. Notification type must exist in prefs
 *   3. `typePref.enabled === true`
 *   4. `typePref.frequency === cadence`
 *   5. `typePref.channels` includes `'email'`
 *
 * @param {object[]}   notifications  - array of undigested notification records
 * @param {object}     userPrefs      - UserPreferences object
 * @param {string}     cadence        - FREQUENCIES.DAILY_DIGEST or WEEKLY_DIGEST
 * @returns {object[]}
 * @throws {Error} if cadence is invalid
 */
export function buildDigestPayload(notifications, userPrefs, cadence) {
  if (!VALID_CADENCES.has(cadence)) {
    throw new Error(
      `Invalid cadence: "${cadence}". Must be one of: ${[...VALID_CADENCES].join(', ')}`,
    );
  }

  // Gate on top-level email channel
  if (!userPrefs?.channels?.email) {
    return [];
  }

  return notifications.filter(notif => {
    const typePref = userPrefs.types?.[notif.type];
    if (!typePref)                              return false;
    if (!typePref.enabled)                      return false;
    if (typePref.frequency !== cadence)         return false;
    if (!typePref.channels?.includes('email'))  return false;
    return true;
  });
}

// ── renderDigestHtml ──────────────────────────────────────────────────────────

/**
 * Render a complete HTML email string for the given digest items.
 *
 * @param {object[]}            items    - notification records to render
 * @param {string}              cadence  - 'daily_digest' | 'weekly_digest'
 * @param {{ date?: string }}   [opts]   - opts.date: ISO date string (for testing)
 * @returns {string}
 */
export function renderDigestHtml(items, cadence, opts = {}) {
  const label    = cadenceLabel(cadence);
  const dateStr  = opts.date ? new Date(opts.date).toDateString() : new Date().toDateString();

  const itemsHtml = items.map(n => {
    const title = escapeHtml(n.title);
    const body  = n.body ? `<p>${escapeHtml(n.body)}</p>` : '';
    const type  = escapeHtml(n.type);
    return `
    <div style="margin-bottom:1.5em;padding-bottom:1em;border-bottom:1px solid #eee;">
      <strong>${title}</strong>
      ${body}
      <small style="color:#888;">Type: ${type}</small>
    </div>`.trimStart();
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Your ${label} Travel Digest</title></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:1em;">
  <h1>Your ${label} Travel Digest</h1>
  <p style="color:#555;">${dateStr}</p>
  <hr>
  ${itemsHtml}
  <hr>
  <p style="font-size:0.8em;color:#aaa;">
    You are receiving this because you subscribed to ${label.toLowerCase()} digests.
    To unsubscribe, update your notification preferences.
  </p>
</body>
</html>`;
}

// ── renderDigestText ──────────────────────────────────────────────────────────

/**
 * Render a plain-text email string for the given digest items.
 *
 * @param {object[]}            items    - notification records to render
 * @param {string}              cadence  - 'daily_digest' | 'weekly_digest'
 * @param {{ date?: string }}   [opts]   - opts.date: ISO date string (for testing)
 * @returns {string}
 */
export function renderDigestText(items, cadence, opts = {}) {
  const label   = cadenceLabel(cadence);
  const dateStr = opts.date ? new Date(opts.date).toDateString() : new Date().toDateString();

  const lines = items.map(n => {
    const parts = [`- ${n.title}`];
    if (n.body) parts.push(`  ${n.body}`);
    parts.push(`  Type: ${n.type}`);
    return parts.join('\n');
  });

  return [
    `Your ${label} Travel Digest`,
    dateStr,
    '',
    ...lines,
    '',
    `You are receiving this because you subscribed to ${label.toLowerCase()} digests.`,
    'To unsubscribe, update your notification preferences.',
  ].join('\n');
}

// ── processUserDigest ─────────────────────────────────────────────────────────

/**
 * Orchestrate a digest send for a single user.
 *
 * @param {Map<string, object[]>}   notifStore     - notification Map
 * @param {Map<string, object>}     prefStore      - preference Map
 * @param {{ sendEmail: Function }} emailProvider  - { sendEmail({ to, subject, html, text }) }
 * @param {string}                  userId
 * @param {string}                  cadence        - 'daily_digest' | 'weekly_digest'
 * @param {((userId: string) => string) | undefined} [getUserEmail]
 * @returns {Promise<object>}
 */
export async function processUserDigest(
  notifStore,
  prefStore,
  emailProvider,
  userId,
  cadence,
  getUserEmail,
) {
  // 1. Fetch or create user preferences
  if (!prefStore.has(userId)) {
    prefStore.set(userId, createPreferences(userId));
  }
  const userPrefs = prefStore.get(userId);

  // 2. Fetch all undigested notifications
  const undigested = getUndigested(notifStore, userId);

  // 3. Filter for this cadence
  const items = buildDigestPayload(undigested, userPrefs, cadence);

  // 4. Nothing to send
  if (items.length === 0) {
    return { userId, sent: false, reason: 'no_items' };
  }

  // 5. Render email bodies
  const label   = cadenceLabel(cadence).toLowerCase();
  const html    = renderDigestHtml(items, cadence);
  const text    = renderDigestText(items, cadence);
  const subject = `Your ${label} travel digest`;
  const to      = getUserEmail ? getUserEmail(userId) : `${userId}@example.com`;

  // 6. Send email
  try {
    const { messageId } = await emailProvider.sendEmail({ to, subject, html, text });

    // 7. Mark notifications as digested
    const ids = items.map(n => n.id);
    markDigested(notifStore, userId, ids);

    // 8. Return success result
    return { userId, sent: true, count: items.length, messageId };
  } catch (err) {
    return { userId, sent: false, reason: 'send_error', error: err.message };
  }
}

// ── runDigestJob ──────────────────────────────────────────────────────────────

/**
 * Orchestrate a digest send for multiple users.
 *
 * @param {Map<string, object[]>}   notifStore
 * @param {Map<string, object>}     prefStore
 * @param {{ sendEmail: Function }} emailProvider
 * @param {string}                  cadence
 * @param {string[]|undefined}      [userIds]  - defaults to all keys in notifStore
 * @returns {Promise<object>}
 */
export async function runDigestJob(notifStore, prefStore, emailProvider, cadence, userIds) {
  const targets = userIds ?? [...notifStore.keys()];

  let processed = 0;
  let sent      = 0;
  let skipped   = 0;
  const errors  = [];

  for (const userId of targets) {
    processed++;
    const result = await processUserDigest(
      notifStore,
      prefStore,
      emailProvider,
      userId,
      cadence,
    );

    if (result.sent) {
      sent++;
    } else if (result.reason === 'send_error') {
      errors.push(result);
    } else {
      skipped++;
    }
  }

  return { cadence, processed, sent, skipped, errors };
}
