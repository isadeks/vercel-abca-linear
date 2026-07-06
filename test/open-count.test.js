import { describe, it, expect } from 'vitest';
import { openCount } from '../api/_lib/open-count.js';

describe('openCount', () => {
  it('returns 0 for an empty list', () => {
    expect(openCount([])).toBe(0);
  });

  it('counts only open items', () => {
    const items = [
      { status: 'open' },
      { status: 'open' },
      { status: 'completed' },
      { status: 'in-progress' },
    ];
    expect(openCount(items)).toBe(2);
  });

  it('returns 0 when no items are open', () => {
    const items = [{ status: 'completed' }, { status: 'canceled' }];
    expect(openCount(items)).toBe(0);
  });

  it('returns the total count when all items are open', () => {
    const items = [{ status: 'open' }, { status: 'open' }, { status: 'open' }];
    expect(openCount(items)).toBe(3);
  });

  it('throws when items is not an array', () => {
    expect(() => openCount(null)).toThrow(TypeError);
    expect(() => openCount('oops')).toThrow(TypeError);
  });
});
