import { describe, it, expect } from 'vitest';
import { avgCompletionTime } from '../api/_lib/avg-completion-time.js';

const HOUR = 60 * 60 * 1000;
const DAY  = 24 * HOUR;

describe('avgCompletionTime', () => {
  it('returns null for an empty array', () => {
    expect(avgCompletionTime([])).toBeNull();
  });

  it('returns null when no items are completed', () => {
    const items = [
      { status: 'open',     createdAt: '2025-01-01T00:00:00Z', completedAt: null },
      { status: 'canceled', createdAt: '2025-01-02T00:00:00Z', completedAt: null },
    ];
    expect(avgCompletionTime(items)).toBeNull();
  });

  it('returns null when completed items have null completedAt', () => {
    const items = [{ status: 'completed', createdAt: '2025-01-01T00:00:00Z', completedAt: null }];
    expect(avgCompletionTime(items)).toBeNull();
  });

  it('returns the elapsed ms for a single completed item', () => {
    const items = [
      {
        status: 'completed',
        createdAt:   '2025-01-01T00:00:00Z',
        completedAt: '2025-01-02T00:00:00Z',
      },
    ];
    expect(avgCompletionTime(items)).toBe(DAY);
  });

  it('averages across multiple completed items', () => {
    const items = [
      {
        status: 'completed',
        createdAt:   '2025-01-01T00:00:00Z',
        completedAt: '2025-01-02T00:00:00Z', // 1 day
      },
      {
        status: 'completed',
        createdAt:   '2025-01-01T00:00:00Z',
        completedAt: '2025-01-04T00:00:00Z', // 3 days
      },
    ];
    expect(avgCompletionTime(items)).toBe(2 * DAY); // average = 2 days
  });

  it('ignores non-completed items in the average', () => {
    const items = [
      {
        status: 'completed',
        createdAt:   '2025-01-01T00:00:00Z',
        completedAt: '2025-01-02T00:00:00Z', // 1 day
      },
      {
        status: 'open',
        createdAt:   '2025-01-01T00:00:00Z',
        completedAt: null,
      },
    ];
    expect(avgCompletionTime(items)).toBe(DAY);
  });

  it('throws when items is not an array', () => {
    expect(() => avgCompletionTime(42)).toThrow(TypeError);
  });
});
