// Baseline test so `npm test` passes on a clean main before the booking
// modules land. The build gate measures regressions against this green
// baseline; without a passing test on main, `vitest run` exits non-zero
// ("No test files found") and the gate would have nothing to compare against.
// The booking epic's sub-issues add real module tests alongside this one.
import { describe, it, expect } from 'vitest';

describe('toolchain baseline', () => {
  it('runs the test runner', () => {
    expect(1 + 1).toBe(2);
  });
});
