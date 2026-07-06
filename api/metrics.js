// api/metrics.js — Vercel serverless endpoint: GET /api/metrics
// Optional query params: ?from=YYYY-MM-DD&to=YYYY-MM-DD
// Returns three team KPI cards:
//   openItemsCount    — total open items across all members
//   completedThisWeek — completion events in the window (defaults to current week)
//   avgCycleTimeDays  — mean span between a member's first and last event (days)

import { getMetrics } from './_lib/metrics.js';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { from, to } = req.query ?? {};

  const metrics = getMetrics({ from: from ?? null, to: to ?? null });

  return res.status(200).json({
    from:    from    ?? null,
    to:      to      ?? null,
    metrics,
  });
}
