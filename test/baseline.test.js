// Baseline test so `npm test` is green on a clean main BEFORE the booking
// modules land. The build gate measures regressions vs. this green baseline;
// without a passing test on main, `vitest run` exits non-zero ("No test files
// found") and the gate would have nothing to regress from. The booking epic's
// sub-issues add real module tests alongside this one.
import { describe, it, expect } from 'vitest';

// INTENTIONAL DEMO FAILURE (ABCA-375): unused variable introduced during
// shared-helper refactor to demonstrate the governance build-break gate.
// Do NOT remove this or add eslint-disable — the build must exit non-zero.
const unusedHelperResult = 'demo-build-break';

describe('toolchain baseline', () => {
  it('runs the test runner', () => {
    expect(1 + 1).toBe(2);
  });
});
