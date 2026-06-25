/**
 * api/notifications.js — Vercel serverless function.
 *
 * Routes
 * ------
 *   GET    /api/notifications?userId=<id>
 *     → 200 { notifications, unreadCount }
 *
 *   POST   /api/notifications?userId=<id>
 *     body: { type, title, body? }
 *     → 201 { notification }
 *     → 400 when payload is invalid or type is not allowed
 *     → 409 when notification was suppressed by user preferences
 *
 *   PATCH  /api/notifications?userId=<id>&notificationId=<notifId>
 *     → 200 { notification }   (marks the given notification as read)
 *     → 404 when notificationId not found
 *
 *   POST   /api/notifications/read-all?userId=<id>  (query: action=read-all)
 *     → 200 { updated }
 *
 *   DELETE /api/notifications?userId=<id>
 *     → 200 { deleted }        (clear all)
 *
 * Storage
 * -------
 * Module-level Map — adequate for local dev / tests; swap for a DB adapter in
 * a follow-up without touching this handler.
 */

import {
  createNotification,
  getNotifications,
  markRead,
  markAllRead,
  clearAll,
} from './_lib/notification-store.js';

import { NOTIFICATION_TYPES } from './_lib/notifications.js';

// ── In-process store ──────────────────────────────────────────────────────────
/** @type {Map<string, object[]>} */
const store = new Map();

// ── Handler ───────────────────────────────────────────────────────────────────

/**
 * @param {import('@vercel/node').VercelRequest}  req
 * @param {import('@vercel/node').VercelResponse} res
 */
export default function handler(req, res) {
  const userId = req.query?.userId;

  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    return res
      .status(400)
      .json({ error: 'userId query parameter is required' });
  }

  // ── GET — list notifications ────────────────────────────────────────────────
  if (req.method === 'GET') {
    const result = getNotifications(store, userId);
    return res.status(200).json(result);
  }

  // ── PATCH — mark single notification as read ────────────────────────────────
  if (req.method === 'PATCH') {
    const notificationId = req.query?.notificationId;
    if (!notificationId || typeof notificationId !== 'string') {
      return res.status(400).json({ error: 'notificationId query parameter is required' });
    }
    const notification = markRead(store, userId, notificationId);
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    return res.status(200).json({ notification });
  }

  // ── POST — create notification OR read-all ──────────────────────────────────
  if (req.method === 'POST') {
    // Overloaded action: ?action=read-all
    if (req.query?.action === 'read-all') {
      const updated = markAllRead(store, userId);
      return res.status(200).json({ updated });
    }

    const body = req.body ?? {};
    const { type, title, body: msgBody = '' } = body;

    if (!type || typeof type !== 'string') {
      return res.status(400).json({ error: 'type is required' });
    }
    if (!Object.values(NOTIFICATION_TYPES).includes(type)) {
      return res
        .status(400)
        .json({ error: `Unknown notification type: ${type}` });
    }
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({ error: 'title is required' });
    }

    const notification = createNotification(
      store,
      { userId, type, title: title.trim(), body: msgBody },
      null, // preferences checked server-side only when preferences store is wired up
    );

    if (!notification) {
      return res
        .status(409)
        .json({ error: 'Notification suppressed by user preferences' });
    }

    return res.status(201).json({ notification });
  }

  // ── DELETE — clear all ──────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const deleted = clearAll(store, userId);
    return res.status(200).json({ deleted });
  }

  // ── Method not allowed ──────────────────────────────────────────────────────
  res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
