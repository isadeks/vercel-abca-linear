/**
 * api/email-digest.js — Vercel serverless function.
 *
 * Routes
 * ------
 *   POST /api/email-digest?cadence=daily
 *   POST /api/email-digest?cadence=weekly
 *
 * Query parameters
 * ----------------
 *   cadence  "daily" → FREQUENCIES.DAILY_DIGEST
 *            "weekly" → FREQUENCIES.WEEKLY_DIGEST
 *
 * Optional request body
 * ---------------------
 *   { userIds?: string[] }  — limit which users are processed
 *
 * Optional CRON_SECRET env var
 * ----------------------------
 *   When set, the request must carry:
 *     Authorization: Bearer <CRON_SECRET>
 *   Otherwise returns 401.
 *
 * Responses
 * ---------
 *   200 { cadence, processed, sent, skipped, errors }
 *   400 invalid cadence
 *   401 missing/invalid cron secret
 *   405 method not allowed
 */

import { FREQUENCIES }                       from './_lib/notifications.js';
import { notificationStore, preferenceStore } from './_lib/stores.js';
import { runDigestJob }                       from './_lib/email-digest.js';

// ── Cadence mapping ───────────────────────────────────────────────────────────

const CADENCE_MAP = Object.freeze({
  daily:  FREQUENCIES.DAILY_DIGEST,
  weekly: FREQUENCIES.WEEKLY_DIGEST,
});

// ── Stub email provider ───────────────────────────────────────────────────────

const emailProvider = {
  async sendEmail({ to, subject, html, text }) {
    console.log(`[email-digest] Sending to ${to}: ${subject}`);
    void html; void text; // used in production; suppressed in stub
    return { messageId: `stub_${Date.now()}` };
  },
};

// ── Handler ───────────────────────────────────────────────────────────────────

/**
 * @param {import('@vercel/node').VercelRequest}  req
 * @param {import('@vercel/node').VercelResponse} res
 */
export default async function handler(req, res) {
  // ── Method guard ────────────────────────────────────────────────────────────
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  // ── Optional cron secret ────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers?.authorization ?? '';
    if (authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  // ── Cadence validation ──────────────────────────────────────────────────────
  const cadenceParam = req.query?.cadence;
  const cadence      = CADENCE_MAP[cadenceParam];
  if (!cadence) {
    return res.status(400).json({
      error: `Invalid cadence: "${cadenceParam}". Use "daily" or "weekly".`,
    });
  }

  // ── Optional userIds body param ─────────────────────────────────────────────
  const body    = req.body ?? {};
  const userIds = Array.isArray(body.userIds) ? body.userIds : undefined;

  // ── Run digest job ──────────────────────────────────────────────────────────
  const result = await runDigestJob(
    notificationStore,
    preferenceStore,
    emailProvider,
    cadence,
    userIds,
  );

  return res.status(200).json(result);
}
