// api/_lib/metrics.js — KPI rollup helpers for the team dashboard
//
// Derives three key performance indicators from team member and activity data:
//   1. openItemsCount    — total open items across all team members
//   2. completedThisWeek — count of completion-type events in the current ISO
//                          week (Mon–Sun) or within a supplied date range
//   3. avgCycleTimeDays  — average span in days between each member's earliest
//                          and latest activity event (proxy for task cycle time)

import { getAllMembers } from './team.js';
import { getAllEvents, filterByDateRange } from './activity.js';

/**
 * Event types that represent a completed unit of work.
 * @type {Set<string>}
 */
export const COMPLETION_TYPES = new Set(['publish', 'deploy', 'fix', 'review']);

// ── Individual KPI functions ──────────────────────────────────────────────────

/**
 * Sum of open items across all supplied team members.
 * Defaults to all members when none are provided.
 *
 * @param {Array<{openItems: number}>} [members]
 * @returns {number}
 */
export function openItemsCount(members = getAllMembers()) {
  return members.reduce((sum, m) => sum + m.openItems, 0);
}

/**
 * Count completion-type events (publish / deploy / fix / review) within the
 * supplied date range.  When no range is given the function defaults to the
 * current ISO week (Monday through Sunday inclusive).
 *
 * @param {{ from?: string|null, to?: string|null }} [range]
 * @returns {number}
 */
export function completedThisWeek({ from, to } = {}) {
  // Default to current ISO week when no bounds are supplied
  if (!from && !to) {
    const today = new Date();
    const dow = today.getDay(); // 0 = Sunday
    const daysToMonday = dow === 0 ? 6 : dow - 1;
    const monday = new Date(today);
    monday.setDate(today.getDate() - daysToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    from = monday.toISOString().slice(0, 10);
    to   = sunday.toISOString().slice(0, 10);
  }

  const events = filterByDateRange({ from: from ?? null, to: to ?? null });
  return events.filter(e => COMPLETION_TYPES.has(e.type)).length;
}

/**
 * Average cycle time in days, derived as the mean span between each member's
 * earliest and latest activity event (inclusive).  Members with fewer than
 * two events contribute a span of 0.
 *
 * @param {Array<{memberId: string, date: string}>} [events] - defaults to all events
 * @returns {number} Rounded to one decimal place.
 */
export function avgCycleTimeDays(events = getAllEvents()) {
  // Group dates by member
  /** @type {Record<string, string[]>} */
  const byMember = {};
  for (const e of events) {
    if (!byMember[e.memberId]) byMember[e.memberId] = [];
    byMember[e.memberId].push(e.date);
  }

  const memberIds = Object.keys(byMember);
  if (memberIds.length === 0) return 0;

  let totalDays = 0;
  for (const dates of Object.values(byMember)) {
    if (dates.length < 2) continue; // single-event member: span = 0
    const sorted = [...dates].sort();
    const first  = new Date(sorted[0]);
    const last   = new Date(sorted[sorted.length - 1]);
    totalDays += (last - first) / (1000 * 60 * 60 * 24);
  }

  const avg = totalDays / memberIds.length;
  return Math.round(avg * 10) / 10;
}

// ── Rollup ────────────────────────────────────────────────────────────────────

/**
 * Build a complete KPI rollup for the supplied date range.
 * All three metrics are computed from the same filtered event set.
 *
 * @param {{ from?: string|null, to?: string|null }} [range]
 * @returns {{ openItemsCount: number, completedThisWeek: number, avgCycleTimeDays: number }}
 */
export function getMetrics({ from, to } = {}) {
  const members = getAllMembers();
  const events  = filterByDateRange({ from: from ?? null, to: to ?? null });

  return {
    openItemsCount:    openItemsCount(members),
    completedThisWeek: events.filter(e => COMPLETION_TYPES.has(e.type)).length,
    avgCycleTimeDays:  avgCycleTimeDays(events),
  };
}
