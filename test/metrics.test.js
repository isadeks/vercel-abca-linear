import { describe, it, expect } from 'vitest';
import { metrics } from '../api/_lib/metrics.js';

const ITEMS = [
  { id: 'i1', status: 'open',      createdAt: '2024-03-01T08:00:00Z' },
  { id: 'i2', status: 'open',      createdAt: '2024-03-05T08:00:00Z' },
  { id: 'i3', status: 'completed', createdAt: '2024-03-02T08:00:00Z', completedAt: '2024-03-04T08:00:00Z' },
  { id: 'i4', status: 'completed', createdAt: '2024-03-06T08:00:00Z', completedAt: '2024-03-10T08:00:00Z' },
  { id: 'i5', status: 'open',      createdAt: '2024-03-15T08:00:00Z' },
];

describe('metrics', () => {
  it('counts total, open, and completed items with no date range', () => {
    const result = metrics(ITEMS);
    expect(result.total).toBe(5);
    expect(result.open).toBe(3);
    expect(result.completed).toBe(2);
  });

  it('returns avgCompletionTime in milliseconds', () => {
    const result = metrics(ITEMS);
    // i3: 2 days = 172800000 ms; i4: 4 days = 345600000 ms → avg = 259200000 ms
    expect(result.avgCompletionTime).toBe(259200000);
  });

  it('returns avgCompletionTime null when no completed items exist', () => {
    const onlyOpen = ITEMS.filter((i) => i.status === 'open');
    expect(metrics(onlyOpen).avgCompletionTime).toBeNull();
  });

  it('filters by from date (inclusive, based on createdAt)', () => {
    const result = metrics(ITEMS, '2024-03-05T00:00:00Z');
    // items with createdAt >= 2024-03-05: i2, i4, i5
    expect(result.total).toBe(3);
    expect(result.open).toBe(2);
    expect(result.completed).toBe(1);
  });

  it('filters by to date (inclusive, based on createdAt)', () => {
    const result = metrics(ITEMS, null, '2024-03-05T23:59:59Z');
    // items with createdAt <= 2024-03-05: i1, i2, i3
    expect(result.total).toBe(3);
    expect(result.open).toBe(2);
    expect(result.completed).toBe(1);
  });

  it('filters by both from and to dates', () => {
    const result = metrics(ITEMS, '2024-03-02T00:00:00Z', '2024-03-06T23:59:59Z');
    // items with createdAt in [2024-03-02, 2024-03-06]: i3 (03-02), i2 (03-05), i4 (03-06)
    expect(result.total).toBe(3);
    expect(result.open).toBe(1);
    expect(result.completed).toBe(2);
  });

  it('returns all zeros and null avgCompletionTime when nothing is in range', () => {
    const result = metrics(ITEMS, '2025-01-01T00:00:00Z', '2025-12-31T23:59:59Z');
    expect(result).toEqual({ total: 0, open: 0, completed: 0, avgCompletionTime: null });
  });

  it('returns zeros and null for an empty input', () => {
    expect(metrics([])).toEqual({ total: 0, open: 0, completed: 0, avgCompletionTime: null });
  });

  it('accepts Date objects as from/to', () => {
    const result = metrics(ITEMS, new Date('2024-03-15T00:00:00Z'), new Date('2024-03-15T23:59:59Z'));
    expect(result.total).toBe(1);
    expect(result.open).toBe(1);
  });

  it('throws TypeError when items is not an array', () => {
    expect(() => metrics(null)).toThrow(TypeError);
    expect(() => metrics(undefined)).toThrow(TypeError);
    expect(() => metrics('oops')).toThrow(TypeError);
  });

  it('throws TypeError for an invalid from date', () => {
    expect(() => metrics(ITEMS, 'not-a-date')).toThrow(TypeError);
  });

  it('throws TypeError for an invalid to date', () => {
    expect(() => metrics(ITEMS, null, 'not-a-date')).toThrow(TypeError);
  });

  it('throws RangeError when from is later than to', () => {
    expect(() => metrics(ITEMS, '2024-03-20T00:00:00Z', '2024-03-01T00:00:00Z')).toThrow(RangeError);
  });
});
