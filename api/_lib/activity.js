// api/_lib/activity.js — in-memory activity-event log and date-range filter helpers

/**
 * @typedef {{ id:string, memberId:string, memberName:string, type:string, description:string, date:string }} ActivityEvent
 */

/** Seed data – representative activity events spanning the last 30 days */
const ACTIVITY_LOG = [
  { id: 'a01', memberId: 'u1', memberName: 'Alice Chambers', type: 'edit',    description: 'Revised Kyoto guide introduction',           date: '2026-06-07' },
  { id: 'a02', memberId: 'u2', memberName: 'Ben Nakamura',   type: 'upload',  description: 'Uploaded 12 photos for Amalfi Coast story',   date: '2026-06-08' },
  { id: 'a03', memberId: 'u3', memberName: 'Cleo Martins',   type: 'publish', description: 'Published Patagonia trekking guide',          date: '2026-06-09' },
  { id: 'a04', memberId: 'u4', memberName: 'Demi Hassan',    type: 'design',  description: 'Completed destination card mockups',          date: '2026-06-10' },
  { id: 'a05', memberId: 'u5', memberName: 'Eli Foster',     type: 'deploy',  description: 'Deployed booking API v1.2 to production',     date: '2026-06-11' },
  { id: 'a06', memberId: 'u1', memberName: 'Alice Chambers', type: 'review',  description: 'Reviewed and approved Norway fjords article',  date: '2026-06-13' },
  { id: 'a07', memberId: 'u3', memberName: 'Cleo Martins',   type: 'draft',   description: 'Drafted Rajasthan by Rail outline',           date: '2026-06-15' },
  { id: 'a08', memberId: 'u2', memberName: 'Ben Nakamura',   type: 'upload',  description: 'Processed Norway landscape photography set',  date: '2026-06-17' },
  { id: 'a09', memberId: 'u5', memberName: 'Eli Foster',     type: 'fix',     description: 'Fixed date-picker bug in booking flow',       date: '2026-06-19' },
  { id: 'a10', memberId: 'u4', memberName: 'Demi Hassan',    type: 'design',  description: 'Redesigned quiz result cards',                date: '2026-06-20' },
  { id: 'a11', memberId: 'u1', memberName: 'Alice Chambers', type: 'edit',    description: 'Updated Santorini guide seasonal section',    date: '2026-06-22' },
  { id: 'a12', memberId: 'u3', memberName: 'Cleo Martins',   type: 'publish', description: 'Published Rajasthan guide part one',          date: '2026-06-24' },
  { id: 'a13', memberId: 'u2', memberName: 'Ben Nakamura',   type: 'upload',  description: 'Added hero images for Santorini guide',       date: '2026-06-25' },
  { id: 'a14', memberId: 'u5', memberName: 'Eli Foster',     type: 'deploy',  description: 'Released newsletter signup API endpoint',     date: '2026-06-27' },
  { id: 'a15', memberId: 'u4', memberName: 'Demi Hassan',    type: 'design',  description: 'Finalised team dashboard wireframes',         date: '2026-06-28' },
  { id: 'a16', memberId: 'u1', memberName: 'Alice Chambers', type: 'review',  description: 'Signed off Q3 editorial calendar',            date: '2026-06-30' },
  { id: 'a17', memberId: 'u3', memberName: 'Cleo Martins',   type: 'draft',   description: 'Started Morocco destination deep-dive',       date: '2026-07-01' },
  { id: 'a18', memberId: 'u2', memberName: 'Ben Nakamura',   type: 'upload',  description: 'Submitted Patagonia glacier gallery',         date: '2026-07-02' },
  { id: 'a19', memberId: 'u5', memberName: 'Eli Foster',     type: 'fix',     description: 'Patched availability endpoint edge case',     date: '2026-07-03' },
  { id: 'a20', memberId: 'u4', memberName: 'Demi Hassan',    type: 'design',  description: 'Delivered updated colour-token spec',         date: '2026-07-04' },
];

/**
 * Return a shallow copy of all activity events.
 * @returns {ActivityEvent[]}
 */
export function getAllEvents() {
  return ACTIVITY_LOG.map(e => ({ ...e }));
}

/**
 * Filter events to those whose date falls within [from, to] inclusive.
 * Pass null/undefined for either bound to leave that side open.
 *
 * @param {{ from?: string|null, to?: string|null }} range - ISO date strings (YYYY-MM-DD)
 * @returns {ActivityEvent[]}
 */
export function filterByDateRange({ from, to } = {}) {
  return ACTIVITY_LOG.filter(event => {
    if (from && event.date < from) return false;
    if (to   && event.date > to)   return false;
    return true;
  }).map(e => ({ ...e }));
}

/**
 * Filter events to a specific member id (optionally also within a date range).
 *
 * @param {string} memberId
 * @param {{ from?: string|null, to?: string|null }} range
 * @returns {ActivityEvent[]}
 */
export function filterByMember(memberId, range = {}) {
  return filterByDateRange(range).filter(e => e.memberId === memberId);
}
