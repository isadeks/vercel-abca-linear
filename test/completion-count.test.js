import { describe, it, expect } from 'vitest';
import { completionCount } from '../api/_lib/completion-count.js';

const DAY = 24 * 60 * 60 * 1000;
const base = new Date('2025-03-01T00:00:00.000Z');
const d = (offsetDays) => new Date(base.getTime() + offsetDays * DAY).toISOString();

describe('completionCount', () => {
  const items = [
    { status: 'completed', completedAt: d(0) },   // exactly at start
    { status: 'completed', completedAt: d(5) },   // inside range
    { status: 'completed', completedAt: d(9) },   // exactly at end
    { status: 'completed', completedAt: d(10) },  // one day after range end
    { status: 'open',      completedAt: null },   // not completed
    { status: 'completed', completedAt: null },   // completed but no date
  ];

  it('counts completions that fall within the inclusive range', () => {
    expect(completionCount(items, d(0), d(9))).toBe(3);
  });

  it('returns 0 when none fall in range', () => {
    expect(completionCount(items, d(20), d(30))).toBe(0);
  });

  it('excludes items with no completedAt', () => {
    expect(completionCount(items, d(-1), d(15))).toBe(4);
  });

  it('handles a single-day range', () => {
    expect(completionCount(items, d(5), d(5))).toBe(1);
  });

  it('throws when items is not an array', () => {
    expect(() => completionCount('bad', d(0), d(5))).toThrow(TypeError);
  });

  it('throws for invalid date arguments', () => {
    expect(() => completionCount(items, 'nope', d(5))).toThrow(RangeError);
  });

  it('throws when from > to', () => {
    expect(() => completionCount(items, d(10), d(0))).toThrow(RangeError);
  });
});
