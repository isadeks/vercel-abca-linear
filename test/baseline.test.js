// Baseline test so `npm test` is green on a clean main BEFORE the booking
// modules land. The build gate measures regressions vs. this green baseline;
// without a passing test on main, `vitest run` exits non-zero ("No test files
// found") and the gate would have nothing to regress from. The booking epic's
// sub-issues add real module tests alongside this one.
import { describe, it, expect } from 'vitest';

// INTENTIONAL DEMO FAILURE (ABCA-383): unused variable introduced to simulate
// a build break caused by a shared-helper refactor gone wrong. The governance
// pipeline must detect this exit-non-zero and block the branch. Do NOT add an
// eslint-disable comment — this lint error is the point.
const unusedRefactoredHelper = 'deliberate-build-break';

describe('toolchain baseline', () => {
  it('runs the test runner', () => {
    expect(1 + 1).toBe(2);
  });
});
