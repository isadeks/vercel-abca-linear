// api/team.js — Vercel serverless endpoint: GET /api/team
// Optional query params: ?from=YYYY-MM-DD&to=YYYY-MM-DD
// Returns the team member list annotated with workload scores.
// When from/to are supplied they are passed through in the response envelope
// so callers can verify which window was used.

import { getAllMembers, getMembersByWorkload, workloadScore, workloadLabel } from './_lib/team.js';
import { filterByDateRange } from './_lib/activity.js';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { from, to } = req.query ?? {};

  const members = getMembersByWorkload().map(m => {
    const score = workloadScore(m);
    return {
      ...m,
      workloadScore: score,
      workloadLabel: workloadLabel(score),
    };
  });

  // If a date range is provided, also surface how many activity events each
  // member has in that window (useful for the activity column in the dashboard).
  const activityByMember = {};
  if (from || to) {
    const events = filterByDateRange({ from: from || null, to: to || null });
    for (const event of events) {
      activityByMember[event.memberId] = (activityByMember[event.memberId] ?? 0) + 1;
    }
  } else {
    // No filter — return total counts
    for (const m of getAllMembers()) {
      activityByMember[m.id] = 0;
    }
    const events = filterByDateRange({});
    for (const event of events) {
      activityByMember[event.memberId] = (activityByMember[event.memberId] ?? 0) + 1;
    }
  }

  const membersWithActivity = members.map(m => ({
    ...m,
    activityCount: activityByMember[m.id] ?? 0,
  }));

  return res.status(200).json({
    from: from ?? null,
    to:   to   ?? null,
    members: membersWithActivity,
  });
}
