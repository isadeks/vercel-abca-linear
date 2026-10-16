/**
 * Unit tests for api/_lib/analytics.js
 *
 * Covers:
 *  - validateEvent: valid events, missing required fields, wrong types
 *  - recordEvent / getRawEvents: events land in the store
 *  - aggregateMetrics / getAggregates: rollup counts are correct
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  validateEvent,
  recordEvent,
  aggregateMetrics,
  getAggregates,
  getRawEvents,
  _resetStore,
  VALID_EVENT_TYPES,
} from '../api/_lib/analytics.js';

// Reset in-memory store before every test to keep tests independent.
beforeEach(() => _resetStore());

// ── validateEvent ─────────────────────────────────────────────────────────────

describe('validateEvent', () => {
  it('accepts a minimal valid event (userId present)', () => {
    const result = validateEvent({ type: 'page_view', userId: 'u1' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.event.type).toBe('page_view');
    expect(result.event.userId).toBe('u1');
    expect(result.event.sessionId).toBeNull();
    expect(result.event.page).toBeNull();
    expect(result.event.metadata).toBeNull();
    expect(typeof result.event.timestamp).toBe('string');
  });

  it('accepts a minimal valid event (sessionId present)', () => {
    const result = validateEvent({ type: 'click', sessionId: 's42' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.event.sessionId).toBe('s42');
    expect(result.event.userId).toBeNull();
  });

  it('accepts a fully-populated valid event', () => {
    const result = validateEvent({
      type: 'booking',
      userId: 'u7',
      sessionId: 's99',
      page: '/checkout',
      metadata: { destination: 'kyoto', nights: 3 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.event.page).toBe('/checkout');
    expect(result.event.metadata).toEqual({ destination: 'kyoto', nights: 3 });
  });

  it('accepts all valid event types', () => {
    for (const type of VALID_EVENT_TYPES) {
      const r = validateEvent({ type, sessionId: 'x' });
      expect(r.ok, `type "${type}" should be valid`).toBe(true);
    }
  });

  it('rejects a non-object body', () => {
    for (const bad of [null, 'string', 42, true, []]) {
      const r = validateEvent(bad);
      expect(r.ok, `${JSON.stringify(bad)} should fail`).toBe(false);
    }
  });

  it('rejects an unknown event type', () => {
    const result = validateEvent({ type: 'unknown_event', sessionId: 's1' });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/type/i);
  });

  it('rejects when both userId and sessionId are absent', () => {
    const result = validateEvent({ type: 'page_view' });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/userId|sessionId/i);
  });

  it('rejects a non-string page', () => {
    const result = validateEvent({ type: 'page_view', sessionId: 's', page: 123 });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/page/i);
  });

  it('rejects an array as metadata', () => {
    const result = validateEvent({ type: 'click', sessionId: 's', metadata: [1, 2] });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/metadata/i);
  });
});

// ── recordEvent / getRawEvents ────────────────────────────────────────────────

describe('recordEvent', () => {
  it('stores a validated event and returns it', () => {
    const r = validateEvent({ type: 'search', sessionId: 'abc' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    const stored = recordEvent(r.event);
    expect(stored.type).toBe('search');

    const raw = getRawEvents();
    expect(raw).toHaveLength(1);
    expect(raw[0]).toEqual(stored);
  });

  it('accumulates multiple events', () => {
    for (let i = 0; i < 5; i++) {
      const r = validateEvent({ type: 'click', sessionId: `s${i}` });
      if (r.ok) recordEvent(r.event);
    }
    expect(getRawEvents()).toHaveLength(5);
  });
});

// ── aggregateMetrics / getAggregates ─────────────────────────────────────────

describe('aggregateMetrics', () => {
  it('returns zero totals on an empty store', () => {
    const agg = getAggregates();
    expect(agg.totalEvents).toBe(0);
    expect(agg.totals).toEqual({});
    expect(agg.daily).toEqual([]);
  });

  it('counts events per type correctly', () => {
    const types = ['page_view', 'page_view', 'click', 'booking'];
    for (const type of types) {
      const r = validateEvent({ type, sessionId: 'u' });
      if (r.ok) recordEvent(r.event);
    }

    const agg = getAggregates();
    expect(agg.totalEvents).toBe(4);
    expect(agg.totals.page_view).toBe(2);
    expect(agg.totals.click).toBe(1);
    expect(agg.totals.booking).toBe(1);
  });

  it('aggregateMetrics recomputes from raw log consistently', () => {
    const types = ['error', 'search', 'error'];
    for (const type of types) {
      const r = validateEvent({ type, sessionId: 'x' });
      if (r.ok) recordEvent(r.event);
    }

    // Call twice — should give same result.
    const agg1 = aggregateMetrics();
    const agg2 = aggregateMetrics();
    expect(agg1.totals).toEqual(agg2.totals);
    expect(agg1.totalEvents).toBe(3);
    expect(agg1.totals.error).toBe(2);
    expect(agg1.totals.search).toBe(1);
  });

  it('daily buckets contain correct date and type', () => {
    const r = validateEvent({ type: 'page_view', sessionId: 's' });
    if (r.ok) recordEvent(r.event);

    const agg = getAggregates();
    expect(agg.daily).toHaveLength(1);
    expect(agg.daily[0].type).toBe('page_view');
    expect(agg.daily[0].count).toBe(1);
    // date should be ISO "YYYY-MM-DD"
    expect(agg.daily[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('includes lastAggregatedAt timestamp', () => {
    const agg = getAggregates();
    expect(typeof agg.lastAggregatedAt).toBe('string');
    // Should be a valid ISO date
    expect(isNaN(Date.parse(agg.lastAggregatedAt))).toBe(false);
  });
});
