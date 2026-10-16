/**
 * analytics.js — Core analytics module
 *
 * Responsibilities:
 *  - Event schema validation
 *  - In-memory event store (swap for a real DB in production, e.g. Vercel KV, Postgres)
 *  - Metrics aggregation (daily rollups per event type)
 *
 * Storage note: The in-memory arrays/maps live in the Vercel Function process.
 * For a serverless deployment where each invocation may be a fresh process you
 * would replace `_events` / `_rollups` with a persistent store (Vercel KV,
 * Upstash Redis, Neon Postgres, etc.).  The API surface — validateEvent,
 * recordEvent, aggregateMetrics, getAggregates — is intentionally storage-
 * agnostic so that swap-out is a one-file change.
 */

// ─── Schema ───────────────────────────────────────────────────────────────────

/** Allowed event type strings. */
export const VALID_EVENT_TYPES = new Set([
  'page_view',
  'click',
  'search',
  'booking',
  'error',
]);

/**
 * Validate a raw event payload.
 *
 * @param {unknown} raw
 * @returns {{ ok: true, event: NormalisedEvent } | { ok: false, error: string }}
 */
export function validateEvent(raw) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'Event must be a JSON object' };
  }

  const { type, userId, sessionId, page, metadata } = raw;

  if (typeof type !== 'string' || !VALID_EVENT_TYPES.has(type)) {
    return {
      ok: false,
      error: `'type' must be one of: ${[...VALID_EVENT_TYPES].join(', ')}`,
    };
  }

  // At least one of userId / sessionId is required so events are attributable.
  if (
    (userId !== undefined && typeof userId !== 'string') ||
    (sessionId !== undefined && typeof sessionId !== 'string')
  ) {
    return { ok: false, error: "'userId' and 'sessionId' must be strings when provided" };
  }

  if (userId === undefined && sessionId === undefined) {
    return { ok: false, error: "At least one of 'userId' or 'sessionId' is required" };
  }

  if (page !== undefined && typeof page !== 'string') {
    return { ok: false, error: "'page' must be a string when provided" };
  }

  if (metadata !== undefined && (typeof metadata !== 'object' || Array.isArray(metadata) || metadata === null)) {
    return { ok: false, error: "'metadata' must be a plain object when provided" };
  }

  /** @type {NormalisedEvent} */
  const event = {
    type,
    userId: typeof userId === 'string' ? userId : null,
    sessionId: typeof sessionId === 'string' ? sessionId : null,
    page: typeof page === 'string' ? page : null,
    metadata: metadata !== undefined ? metadata : null,
    timestamp: new Date().toISOString(),
  };

  return { ok: true, event };
}

// ─── In-memory store ──────────────────────────────────────────────────────────

/** @type {NormalisedEvent[]} */
const _events = [];

/**
 * Daily rollup map.
 * key   → "YYYY-MM-DD|eventType"
 * value → count
 * @type {Map<string, number>}
 */
const _rollups = new Map();

// ─── Store operations ─────────────────────────────────────────────────────────

/**
 * Record a validated event and immediately update the rollup counters.
 *
 * @param {NormalisedEvent} event  Output of validateEvent().event
 * @returns {NormalisedEvent}
 */
export function recordEvent(event) {
  _events.push(event);
  _incrementRollup(event.type, event.timestamp);
  return event;
}

/**
 * Re-compute all daily rollups from the raw event log.
 * Call this from the cron aggregation job to ensure consistency.
 *
 * @returns {AggregateResult}
 */
export function aggregateMetrics() {
  _rollups.clear();
  for (const ev of _events) {
    _incrementRollup(ev.type, ev.timestamp);
  }
  return getAggregates();
}

/**
 * Return the current aggregated metrics snapshot.
 *
 * @returns {AggregateResult}
 */
export function getAggregates() {
  /** @type {DailyBucket[]} */
  const daily = [];

  for (const [key, count] of _rollups) {
    const [date, type] = key.split('|');
    daily.push({ date, type, count });
  }

  // Sort chronologically, then by type for deterministic output.
  daily.sort((a, b) =>
    a.date !== b.date ? a.date.localeCompare(b.date) : a.type.localeCompare(b.type),
  );

  const totals = {};
  for (const { type, count } of daily) {
    totals[type] = (totals[type] ?? 0) + count;
  }

  return {
    totalEvents: _events.length,
    totals,
    daily,
    lastAggregatedAt: new Date().toISOString(),
  };
}

/**
 * Return a copy of raw events (for testing / debugging only).
 * @returns {NormalisedEvent[]}
 */
export function getRawEvents() {
  return [..._events];
}

/**
 * Reset the store — test helper only.
 */
export function _resetStore() {
  _events.length = 0;
  _rollups.clear();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * @param {string} type
 * @param {string} isoTimestamp
 */
function _incrementRollup(type, isoTimestamp) {
  const date = isoTimestamp.slice(0, 10); // "YYYY-MM-DD"
  const key = `${date}|${type}`;
  _rollups.set(key, (_rollups.get(key) ?? 0) + 1);
}

// ─── JSDoc types ──────────────────────────────────────────────────────────────

/**
 * @typedef {Object} NormalisedEvent
 * @property {string}      type
 * @property {string|null} userId
 * @property {string|null} sessionId
 * @property {string|null} page
 * @property {object|null} metadata
 * @property {string}      timestamp  ISO-8601
 */

/**
 * @typedef {Object} DailyBucket
 * @property {string} date   "YYYY-MM-DD"
 * @property {string} type
 * @property {number} count
 */

/**
 * @typedef {Object} AggregateResult
 * @property {number}                     totalEvents
 * @property {Record<string, number>}     totals
 * @property {DailyBucket[]}              daily
 * @property {string}                     lastAggregatedAt
 */
