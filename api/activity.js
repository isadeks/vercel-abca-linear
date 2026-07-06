// api/activity.js — Vercel serverless endpoint: GET /api/activity
// Optional query params: ?from=YYYY-MM-DD&to=YYYY-MM-DD&memberId=<id>
// Returns an array of activity events, newest first.

import { getAllEvents, filterByDateRange, filterByMember } from './_lib/activity.js';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { from, to, memberId } = req.query ?? {};

  let events;
  if (memberId) {
    events = filterByMember(memberId, { from: from || null, to: to || null });
  } else if (from || to) {
    events = filterByDateRange({ from: from || null, to: to || null });
  } else {
    events = getAllEvents();
  }

  // Sort newest first
  events.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  return res.status(200).json({
    from:     from     ?? null,
    to:       to       ?? null,
    memberId: memberId ?? null,
    total:    events.length,
    events,
  });
}
