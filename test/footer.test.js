// Tests for the Footer component (../components/Footer.js).
import { afterEach, describe, expect, it } from 'vitest';
import { Footer, resolveBuildTime } from '../components/Footer.js';

const ORIGINAL_BUILD_TIME = process.env.BUILD_TIME;

afterEach(() => {
  if (ORIGINAL_BUILD_TIME === undefined) {
    delete process.env.BUILD_TIME;
  } else {
    process.env.BUILD_TIME = ORIGINAL_BUILD_TIME;
  }
});

describe('resolveBuildTime', () => {
  it('prefers an explicit build time argument', () => {
    process.env.BUILD_TIME = '2020-01-01T00:00:00Z';
    expect(resolveBuildTime('2026-07-29T12:00:00Z')).toBe('2026-07-29T12:00:00Z');
  });

  it('reads the BUILD_TIME env var when no argument is given', () => {
    process.env.BUILD_TIME = '2026-07-29T12:00:00Z';
    expect(resolveBuildTime()).toBe('2026-07-29T12:00:00Z');
  });

  it('falls back to render time when nothing is set', () => {
    delete process.env.BUILD_TIME;
    const before = Date.now();
    const result = resolveBuildTime();
    const after = Date.now();
    const parsed = Date.parse(result);
    expect(Number.isNaN(parsed)).toBe(false);
    expect(parsed).toBeGreaterThanOrEqual(before);
    expect(parsed).toBeLessThanOrEqual(after);
  });
});

describe('Footer', () => {
  it('renders the provided build timestamp inside a footer element', () => {
    const html = Footer({ buildTime: '2026-07-29T12:00:00Z' });
    expect(html).toContain('<footer');
    expect(html).toContain('</footer>');
    expect(html).toContain('2026-07-29T12:00:00Z');
    expect(html).toContain('<time datetime="2026-07-29T12:00:00Z">');
  });

  it('uses the BUILD_TIME env var by default', () => {
    process.env.BUILD_TIME = '2025-05-05T05:05:05Z';
    expect(Footer()).toContain('2025-05-05T05:05:05Z');
  });

  it('applies minimal, muted, centred styling', () => {
    const html = Footer({ buildTime: '2026-07-29T12:00:00Z' });
    expect(html).toContain('text-align:center');
    expect(html).toContain('color:#888');
    expect(html).toContain('font-size:0.75rem');
  });

  it('escapes untrusted timestamp values', () => {
    const html = Footer({ buildTime: '<script>"x"' });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&quot;x&quot;');
  });
});
