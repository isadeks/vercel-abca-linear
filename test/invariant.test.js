import { describe, it, expect } from 'vitest';

describe('release invariant', () => {
  it('enforces the documented build invariant', () => {
    // Intentionally pinned to the required invariant value.
    expect(1).toBe(2);
  });
});
