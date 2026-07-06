import { describe, it, expect } from 'vitest';
import { activity } from '../api/_lib/activity.js';

const EVENTS = [
  { id: '1', actor: 'alice', action: 'created', subject: 'task-A', timestamp: '2024-03-01T08:00:00Z' },
  { id: '2', actor: 'bob',   action: 'closed',  subject: 'task-B', timestamp: '2024-03-05T12:00:00Z' },
  { id: '3', actor: 'carol', action: 'updated', subject: 'task-C', timestamp: '2024-03-10T16:00:00Z' },
  { id: '4', actor: 'alice', action: 'created', subject: 'task-D', timestamp: '2024-03-15T09:00:00Z' },
  { id: '5', actor: 'bob',   action: 'closed',  subject: 'task-E', timestamp: '2024-03-20T14:00:00Z' },
];

describe('activity', () => {
  it('returns all events when no date range is given', () => {
    expect(activity(EVENTS)).toHaveLength(5);
  });

  it('returns events sorted newest-first', () => {
    const result = activity(EVENTS);
    expect(result[0].id).toBe('5');
    expect(result[4].id).toBe('1');
  });

  it('filters events by from date (inclusive)', () => {
    const result = activity(EVENTS, '2024-03-10T00:00:00Z');
    expect(result).toHaveLength(3);
    expect(result.map((e) => e.id)).toContain('3');
    expect(result.map((e) => e.id)).toContain('4');
    expect(result.map((e) => e.id)).toContain('5');
  });

  it('filters events by to date (inclusive)', () => {
    const result = activity(EVENTS, null, '2024-03-05T23:59:59Z');
    expect(result).toHaveLength(2);
    expect(result.map((e) => e.id)).toContain('1');
    expect(result.map((e) => e.id)).toContain('2');
  });

  it('filters events by both from and to dates', () => {
    const result = activity(EVENTS, '2024-03-05T00:00:00Z', '2024-03-15T23:59:59Z');
    expect(result).toHaveLength(3);
    expect(result.map((e) => e.id)).toEqual(['4', '3', '2']);
  });

  it('returns an empty array when no events fall in the range', () => {
    const result = activity(EVENTS, '2025-01-01T00:00:00Z', '2025-12-31T23:59:59Z');
    expect(result).toHaveLength(0);
  });

  it('returns an empty array for an empty input', () => {
    expect(activity([])).toHaveLength(0);
  });

  it('accepts Date objects as from/to', () => {
    const result = activity(EVENTS, new Date('2024-03-10T00:00:00Z'), new Date('2024-03-10T23:59:59Z'));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('3');
  });

  it('does not mutate the original array', () => {
    const copy = EVENTS.slice();
    activity(EVENTS, '2024-03-01T00:00:00Z', '2024-03-05T23:59:59Z');
    expect(EVENTS).toEqual(copy);
  });

  it('throws TypeError when events is not an array', () => {
    expect(() => activity(null)).toThrow(TypeError);
    expect(() => activity(undefined)).toThrow(TypeError);
    expect(() => activity('not an array')).toThrow(TypeError);
  });

  it('throws TypeError for an invalid from date', () => {
    expect(() => activity(EVENTS, 'not-a-date')).toThrow(TypeError);
  });

  it('throws TypeError for an invalid to date', () => {
    expect(() => activity(EVENTS, null, 'not-a-date')).toThrow(TypeError);
  });

  it('throws RangeError when from is later than to', () => {
    expect(() => activity(EVENTS, '2024-03-20T00:00:00Z', '2024-03-01T00:00:00Z')).toThrow(RangeError);
  });
});
