// Baseline test so `npm test` is green on a clean main BEFORE the booking
// modules land. The build gate measures regressions vs. this green baseline;
// without a passing test on main, `vitest run` exits non-zero ("No test files
// found") and the gate would have nothing to regress from. The booking epic's
// sub-issues add real module tests alongside this one.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

describe('toolchain baseline', () => {
  it('runs the test runner', () => {
    expect(1 + 1).toBe(2);
  });
});

describe('footer copyright year', () => {
  const pages = [
    'index.html',
    'about.html',
    'contact.html',
    'destinations.html',
    'privacy.html',
    'terms.html',
  ];

  it.each(pages)('%s footer shows copyright 2026', (page) => {
    const content = readFileSync(join(rootDir, page), 'utf8');
    // Footer uses HTML entity &copy; followed by the year
    expect(content).toMatch(/&copy;\s*2026/);
    expect(content).not.toMatch(/&copy;\s*2025/);
  });
});
