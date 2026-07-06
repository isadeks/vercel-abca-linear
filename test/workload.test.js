import { describe, it, expect } from 'vitest';
import { workload } from '../api/_lib/workload.js';

describe('workload', () => {
  it('returns an empty object for an empty list', () => {
    expect(workload([])).toEqual({});
  });

  it('counts open items per assignee', () => {
    const items = [
      { assignee: 'alice', status: 'open' },
      { assignee: 'alice', status: 'open' },
      { assignee: 'bob',   status: 'open' },
    ];
    expect(workload(items)).toEqual({ alice: 2, bob: 1 });
  });

  it('ignores non-open items', () => {
    const items = [
      { assignee: 'alice', status: 'open' },
      { assignee: 'alice', status: 'completed' },
      { assignee: 'bob',   status: 'canceled' },
    ];
    expect(workload(items)).toEqual({ alice: 1 });
  });

  it('groups items with no assignee under "unassigned"', () => {
    const items = [
      { assignee: null,      status: 'open' },
      { assignee: undefined, status: 'open' },
      { assignee: 'alice',   status: 'open' },
    ];
    const result = workload(items);
    expect(result.unassigned).toBe(2);
    expect(result.alice).toBe(1);
  });

  it('returns an empty object when all items are closed', () => {
    const items = [
      { assignee: 'alice', status: 'completed' },
      { assignee: 'bob',   status: 'canceled' },
    ];
    expect(workload(items)).toEqual({});
  });

  it('throws when items is not an array', () => {
    expect(() => workload({})).toThrow(TypeError);
    expect(() => workload(null)).toThrow(TypeError);
  });
});
