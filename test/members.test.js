import { describe, it, expect } from 'vitest';
import { members } from '../api/_lib/members.js';

const ITEMS = [
  { id: 'i1', status: 'open',      assignee: 'alice', createdAt: '2024-03-01T08:00:00Z' },
  { id: 'i2', status: 'open',      assignee: 'bob',   createdAt: '2024-03-05T08:00:00Z' },
  { id: 'i3', status: 'completed', assignee: 'alice', createdAt: '2024-03-02T08:00:00Z', completedAt: '2024-03-04T08:00:00Z' },
  { id: 'i4', status: 'completed', assignee: 'bob',   createdAt: '2024-03-06T08:00:00Z', completedAt: '2024-03-10T08:00:00Z' },
  { id: 'i5', status: 'open',      assignee: 'carol', createdAt: '2024-03-15T08:00:00Z' },
  { id: 'i6', status: 'open',                         createdAt: '2024-03-20T08:00:00Z' },
];

describe('members', () => {
  it('returns one entry per assignee plus unassigned', () => {
    const result = members(ITEMS);
    expect(result).toHaveLength(4); // alice, bob, carol, unassigned
  });

  it('returns results sorted alphabetically by member name', () => {
    const result = members(ITEMS);
    const names = result.map((r) => r.member);
    expect(names).toEqual(['alice', 'bob', 'carol', 'unassigned']);
  });

  it('counts open and completed items per member correctly', () => {
    const result = members(ITEMS);
    const alice = result.find((r) => r.member === 'alice');
    const bob = result.find((r) => r.member === 'bob');
    const carol = result.find((r) => r.member === 'carol');
    const unassigned = result.find((r) => r.member === 'unassigned');

    expect(alice).toEqual({ member: 'alice', open: 1, completed: 1 });
    expect(bob).toEqual({ member: 'bob', open: 1, completed: 1 });
    expect(carol).toEqual({ member: 'carol', open: 1, completed: 0 });
    expect(unassigned).toEqual({ member: 'unassigned', open: 1, completed: 0 });
  });

  it('filters by from date (inclusive, based on createdAt)', () => {
    // Items with createdAt >= 2024-03-15: i5 (carol), i6 (unassigned)
    const result = members(ITEMS, '2024-03-15T00:00:00Z');
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.member)).toEqual(['carol', 'unassigned']);
  });

  it('filters by to date (inclusive, based on createdAt)', () => {
    // Items with createdAt <= 2024-03-05: i1 (alice), i2 (bob), i3 (alice)
    const result = members(ITEMS, null, '2024-03-05T23:59:59Z');
    expect(result).toHaveLength(2);
    const alice = result.find((r) => r.member === 'alice');
    expect(alice).toEqual({ member: 'alice', open: 1, completed: 1 });
  });

  it('filters by both from and to dates', () => {
    // Items with createdAt in [2024-03-02, 2024-03-06]: i3 (alice), i2 (bob), i4 (bob)
    const result = members(ITEMS, '2024-03-02T00:00:00Z', '2024-03-06T23:59:59Z');
    expect(result).toHaveLength(2);
    const alice = result.find((r) => r.member === 'alice');
    const bob = result.find((r) => r.member === 'bob');
    expect(alice).toEqual({ member: 'alice', open: 0, completed: 1 });
    expect(bob).toEqual({ member: 'bob', open: 1, completed: 1 });
  });

  it('returns an empty array when no items fall in range', () => {
    const result = members(ITEMS, '2025-01-01T00:00:00Z', '2025-12-31T23:59:59Z');
    expect(result).toEqual([]);
  });

  it('returns an empty array for empty input', () => {
    expect(members([])).toEqual([]);
  });

  it('groups items with no assignee under "unassigned"', () => {
    const items = [
      { id: 'x1', status: 'open', createdAt: '2024-01-01T00:00:00Z' },
      { id: 'x2', status: 'completed', createdAt: '2024-01-02T00:00:00Z' },
    ];
    const result = members(items);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ member: 'unassigned', open: 1, completed: 1 });
  });

  it('accepts Date objects as from/to', () => {
    const result = members(ITEMS, new Date('2024-03-15T00:00:00Z'), new Date('2024-03-20T23:59:59Z'));
    expect(result).toHaveLength(2);
  });

  it('throws TypeError when items is not an array', () => {
    expect(() => members(null)).toThrow(TypeError);
    expect(() => members(undefined)).toThrow(TypeError);
    expect(() => members('oops')).toThrow(TypeError);
  });

  it('throws TypeError for an invalid from date', () => {
    expect(() => members(ITEMS, 'not-a-date')).toThrow(TypeError);
  });

  it('throws TypeError for an invalid to date', () => {
    expect(() => members(ITEMS, null, 'not-a-date')).toThrow(TypeError);
  });

  it('throws RangeError when from is later than to', () => {
    expect(() => members(ITEMS, '2024-03-20T00:00:00Z', '2024-03-01T00:00:00Z')).toThrow(RangeError);
  });
});
