import { describe, it, expect } from 'vitest';
import { recentActivity } from '../api/_lib/recent-activity.js';

const events = [
  { id: '1', actor: 'alice', action: 'created',   subject: 'task-A', timestamp: '2025-03-01T10:00:00Z' },
  { id: '2', actor: 'bob',   action: 'completed',  subject: 'task-B', timestamp: '2025-03-03T09:00:00Z' },
  { id: '3', actor: 'alice', action: 'commented',  subject: 'task-A', timestamp: '2025-03-02T14:00:00Z' },
  { id: '4', actor: 'carol', action: 'created',    subject: 'task-C', timestamp: '2025-03-04T11:00:00Z' },
  { id: '5', actor: 'bob',   action: 'in-progress', subject: 'task-D', timestamp: '2025-03-04T08:00:00Z' },
];

describe('recentActivity', () => {
  it('returns events sorted newest-first', () => {
    const result = recentActivity(events);
    expect(result[0].id).toBe('4');
    expect(result[1].id).toBe('5');
    expect(result[2].id).toBe('2');
    expect(result[3].id).toBe('3');
    expect(result[4].id).toBe('1');
  });

  it('respects the limit parameter', () => {
    const result = recentActivity(events, 3);
    expect(result).toHaveLength(3);
    expect(result[0].id).toBe('4');
  });

  it('returns all events when limit exceeds the count', () => {
    expect(recentActivity(events, 100)).toHaveLength(events.length);
  });

  it('returns an empty array for limit = 0', () => {
    expect(recentActivity(events, 0)).toEqual([]);
  });

  it('defaults to a limit of 10', () => {
    // build 15 events
    const many = Array.from({ length: 15 }, (_, i) => ({
      id: String(i),
      actor: 'x',
      action: 'ping',
      timestamp: new Date(i * 1000).toISOString(),
    }));
    expect(recentActivity(many)).toHaveLength(10);
  });

  it('does not mutate the original array', () => {
    const copy = [...events];
    recentActivity(events);
    expect(events).toEqual(copy);
  });

  it('throws when events is not an array', () => {
    expect(() => recentActivity('oops')).toThrow(TypeError);
  });

  it('throws when limit is not a non-negative integer', () => {
    expect(() => recentActivity(events, -1)).toThrow(RangeError);
    expect(() => recentActivity(events, 2.5)).toThrow(RangeError);
  });
});
