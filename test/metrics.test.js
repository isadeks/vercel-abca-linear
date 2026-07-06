/**
 * test/metrics.test.js
 *
 * Unit tests for api/_lib/metrics.js
 * KPI helpers: openItemsCount, completedThisWeek, avgCycleTimeDays, getMetrics
 */
import { describe, it, expect } from 'vitest';

import {
  COMPLETION_TYPES,
  openItemsCount,
  completedThisWeek,
  avgCycleTimeDays,
  getMetrics,
} from '../api/_lib/metrics.js';

import { getAllMembers } from '../api/_lib/team.js';
import { getAllEvents }  from '../api/_lib/activity.js';

// ── COMPLETION_TYPES ──────────────────────────────────────────────────────────

describe('COMPLETION_TYPES', () => {
  it('is a Set', () => {
    expect(COMPLETION_TYPES).toBeInstanceOf(Set);
  });
  it('includes publish, deploy, fix, review', () => {
    expect(COMPLETION_TYPES.has('publish')).toBe(true);
    expect(COMPLETION_TYPES.has('deploy')).toBe(true);
    expect(COMPLETION_TYPES.has('fix')).toBe(true);
    expect(COMPLETION_TYPES.has('review')).toBe(true);
  });
  it('does not include non-completion types', () => {
    expect(COMPLETION_TYPES.has('edit')).toBe(false);
    expect(COMPLETION_TYPES.has('upload')).toBe(false);
    expect(COMPLETION_TYPES.has('draft')).toBe(false);
    expect(COMPLETION_TYPES.has('design')).toBe(false);
  });
});

// ── openItemsCount ────────────────────────────────────────────────────────────

describe('openItemsCount()', () => {
  it('sums openItems across all members when called with no arguments', () => {
    const members = getAllMembers();
    const expected = members.reduce((sum, m) => sum + m.openItems, 0);
    expect(openItemsCount()).toBe(expected);
  });

  it('sums openItems for a custom member list', () => {
    const custom = [
      { openItems: 3, inProgressItems: 1 },
      { openItems: 5, inProgressItems: 0 },
    ];
    expect(openItemsCount(custom)).toBe(8);
  });

  it('returns 0 for an empty member list', () => {
    expect(openItemsCount([])).toBe(0);
  });
});

// ── completedThisWeek ─────────────────────────────────────────────────────────

describe('completedThisWeek()', () => {
  it('returns a non-negative integer', () => {
    const result = completedThisWeek();
    expect(typeof result).toBe('number');
    expect(result).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(result)).toBe(true);
  });

  it('counts only completion-type events in a supplied range', () => {
    // Range covers a slice of seed data with known events
    const result = completedThisWeek({ from: '2026-06-07', to: '2026-07-04' });
    // Manually count: publish(a03), deploy(a05), review(a06), fix(a09),
    //                 publish(a12), deploy(a14), review(a16), fix(a19) = 8
    expect(result).toBe(8);
  });

  it('returns 0 when the range has no events', () => {
    expect(completedThisWeek({ from: '2099-01-01', to: '2099-12-31' })).toBe(0);
  });

  it('respects a single-day range', () => {
    // 2026-06-09: a03 is publish — should be 1
    const result = completedThisWeek({ from: '2026-06-09', to: '2026-06-09' });
    expect(result).toBe(1);
  });
});

// ── avgCycleTimeDays ──────────────────────────────────────────────────────────

describe('avgCycleTimeDays()', () => {
  it('returns a non-negative number when called with all events', () => {
    const result = avgCycleTimeDays();
    expect(typeof result).toBe('number');
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it('returns 0 for an empty event list', () => {
    expect(avgCycleTimeDays([])).toBe(0);
  });

  it('returns 0 when every member has only one event', () => {
    const events = [
      { memberId: 'm1', date: '2026-01-10' },
      { memberId: 'm2', date: '2026-02-15' },
    ];
    expect(avgCycleTimeDays(events)).toBe(0);
  });

  it('calculates the correct average for a simple two-member case', () => {
    const events = [
      // member A: span = 10 days
      { memberId: 'mA', date: '2026-01-01' },
      { memberId: 'mA', date: '2026-01-11' },
      // member B: span = 20 days
      { memberId: 'mB', date: '2026-02-01' },
      { memberId: 'mB', date: '2026-02-21' },
    ];
    // avg = (10 + 20) / 2 = 15
    expect(avgCycleTimeDays(events)).toBe(15);
  });

  it('rounds to one decimal place', () => {
    const events = [
      // member A: span = 1 day
      { memberId: 'mA', date: '2026-01-01' },
      { memberId: 'mA', date: '2026-01-02' },
      // member B: span = 2 days
      { memberId: 'mB', date: '2026-03-01' },
      { memberId: 'mB', date: '2026-03-03' },
      // member C: 1 event — span 0
      { memberId: 'mC', date: '2026-06-01' },
    ];
    // totalDays = 1 + 2, members = 3 → avg = 1.0
    expect(avgCycleTimeDays(events)).toBe(1);
  });
});

// ── getMetrics rollup ─────────────────────────────────────────────────────────

describe('getMetrics()', () => {
  it('returns an object with the three KPI keys', () => {
    const kpis = getMetrics({});
    expect(kpis).toHaveProperty('openItemsCount');
    expect(kpis).toHaveProperty('completedThisWeek');
    expect(kpis).toHaveProperty('avgCycleTimeDays');
  });

  it('openItemsCount matches the sum from team lib', () => {
    const members = getAllMembers();
    const expected = members.reduce((sum, m) => sum + m.openItems, 0);
    expect(getMetrics({}).openItemsCount).toBe(expected);
  });

  it('completedThisWeek matches manual count for a fixed range', () => {
    const range = { from: '2026-06-07', to: '2026-07-04' };
    const events = getAllEvents().filter(e => e.date >= range.from && e.date <= range.to);
    const expected = events.filter(e => COMPLETION_TYPES.has(e.type)).length;
    expect(getMetrics(range).completedThisWeek).toBe(expected);
  });

  it('avgCycleTimeDays matches direct helper for a fixed range', () => {
    const range = { from: '2026-06-07', to: '2026-07-04' };
    const events = getAllEvents().filter(e => e.date >= range.from && e.date <= range.to);
    expect(getMetrics(range).avgCycleTimeDays).toBe(avgCycleTimeDays(events));
  });

  it('works with no arguments (defaults to current week for completedThisWeek)', () => {
    const kpis = getMetrics();
    expect(typeof kpis.openItemsCount).toBe('number');
    expect(typeof kpis.completedThisWeek).toBe('number');
    expect(typeof kpis.avgCycleTimeDays).toBe('number');
  });
});
