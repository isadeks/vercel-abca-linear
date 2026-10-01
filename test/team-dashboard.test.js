/**
 * test/team-dashboard.test.js
 *
 * Unit tests for the team-dashboard lib helpers:
 *   - api/_lib/team.js
 *   - api/_lib/activity.js
 */
import { describe, it, expect } from 'vitest';

import {
  getAllMembers,
  getMemberById,
  getMembersByWorkload,
  workloadScore,
} from '../api/_lib/team.js';

import {
  getAllEvents,
  filterByDateRange,
  filterByMember,
} from '../api/_lib/activity.js';

// ── team.js tests ──────────────────────────────────────────────────────────

describe('team helpers', () => {
  describe('getAllMembers()', () => {
    it('returns an array with at least one member', () => {
      expect(getAllMembers().length).toBeGreaterThan(0);
    });

    it('each member has required fields', () => {
      for (const m of getAllMembers()) {
        expect(m).toHaveProperty('id');
        expect(m).toHaveProperty('name');
        expect(m).toHaveProperty('role');
        expect(typeof m.openItems).toBe('number');
        expect(typeof m.inProgressItems).toBe('number');
      }
    });

    it('returns a copy — mutation does not affect the store', () => {
      const members = getAllMembers();
      members[0].name = '__mutated__';
      expect(getAllMembers()[0].name).not.toBe('__mutated__');
    });
  });

  describe('getMemberById()', () => {
    it('returns the correct member for a known id', () => {
      const m = getMemberById('u1');
      expect(m).not.toBeNull();
      expect(m.id).toBe('u1');
    });

    it('returns null for an unknown id', () => {
      expect(getMemberById('does-not-exist')).toBeNull();
    });

    it('returns a copy — mutation does not affect the store', () => {
      const m = getMemberById('u1');
      m.name = '__mutated__';
      expect(getMemberById('u1').name).not.toBe('__mutated__');
    });
  });

  describe('workloadScore()', () => {
    it('returns openItems + inProgressItems * 2', () => {
      expect(workloadScore({ openItems: 3, inProgressItems: 2 })).toBe(7);
      expect(workloadScore({ openItems: 0, inProgressItems: 0 })).toBe(0);
      expect(workloadScore({ openItems: 5, inProgressItems: 0 })).toBe(5);
      expect(workloadScore({ openItems: 0, inProgressItems: 4 })).toBe(8);
    });
  });

  describe('getMembersByWorkload()', () => {
    it('returns all members', () => {
      expect(getMembersByWorkload().length).toBe(getAllMembers().length);
    });

    it('is sorted highest-workload first', () => {
      const sorted = getMembersByWorkload();
      for (let i = 1; i < sorted.length; i++) {
        expect(workloadScore(sorted[i - 1])).toBeGreaterThanOrEqual(workloadScore(sorted[i]));
      }
    });
  });
});

// ── activity.js tests ──────────────────────────────────────────────────────

describe('activity helpers', () => {
  describe('getAllEvents()', () => {
    it('returns an array with at least one event', () => {
      expect(getAllEvents().length).toBeGreaterThan(0);
    });

    it('each event has required fields', () => {
      for (const e of getAllEvents()) {
        expect(e).toHaveProperty('id');
        expect(e).toHaveProperty('memberId');
        expect(e).toHaveProperty('memberName');
        expect(e).toHaveProperty('type');
        expect(e).toHaveProperty('description');
        expect(typeof e.date).toBe('string');
        // date should look like YYYY-MM-DD
        expect(e.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    });

    it('returns a copy — mutation does not affect the store', () => {
      const events = getAllEvents();
      events[0].description = '__mutated__';
      expect(getAllEvents()[0].description).not.toBe('__mutated__');
    });
  });

  describe('filterByDateRange()', () => {
    it('returns all events when no bounds are supplied', () => {
      expect(filterByDateRange().length).toBe(getAllEvents().length);
      expect(filterByDateRange({}).length).toBe(getAllEvents().length);
    });

    it('filters with a "from" bound only', () => {
      const results = filterByDateRange({ from: '2026-07-01' });
      expect(results.length).toBeGreaterThan(0);
      for (const e of results) {
        expect(e.date >= '2026-07-01').toBe(true);
      }
    });

    it('filters with a "to" bound only', () => {
      const results = filterByDateRange({ to: '2026-06-10' });
      expect(results.length).toBeGreaterThan(0);
      for (const e of results) {
        expect(e.date <= '2026-06-10').toBe(true);
      }
    });

    it('filters with both bounds', () => {
      const results = filterByDateRange({ from: '2026-06-15', to: '2026-06-20' });
      expect(results.length).toBeGreaterThan(0);
      for (const e of results) {
        expect(e.date >= '2026-06-15').toBe(true);
        expect(e.date <= '2026-06-20').toBe(true);
      }
    });

    it('returns empty array when range matches nothing', () => {
      const results = filterByDateRange({ from: '2099-01-01', to: '2099-12-31' });
      expect(results).toHaveLength(0);
    });

    it('includes events on the boundary dates (inclusive)', () => {
      const firstEvent = getAllEvents().sort((a, b) => a.date.localeCompare(b.date))[0];
      const results = filterByDateRange({ from: firstEvent.date, to: firstEvent.date });
      expect(results.some(e => e.id === firstEvent.id)).toBe(true);
    });
  });

  describe('filterByMember()', () => {
    it('returns only events for the specified member', () => {
      const results = filterByMember('u1');
      expect(results.length).toBeGreaterThan(0);
      for (const e of results) {
        expect(e.memberId).toBe('u1');
      }
    });

    it('returns empty array for an unknown memberId', () => {
      expect(filterByMember('unknown-id')).toHaveLength(0);
    });

    it('applies a date range on top of the member filter', () => {
      const results = filterByMember('u1', { from: '2026-06-01', to: '2026-06-15' });
      for (const e of results) {
        expect(e.memberId).toBe('u1');
        expect(e.date >= '2026-06-01').toBe(true);
        expect(e.date <= '2026-06-15').toBe(true);
      }
    });
  });
});
