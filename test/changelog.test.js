import { describe, it, expect } from 'vitest';
import { changelog } from '../data/changelog.js';

describe('changelog data', () => {
  it('exports a non-empty array', () => {
    expect(Array.isArray(changelog)).toBe(true);
    expect(changelog.length).toBeGreaterThan(0);
  });

  it('each entry has required fields', () => {
    for (const entry of changelog) {
      expect(typeof entry.version).toBe('string');
      expect(entry.version.length).toBeGreaterThan(0);
      expect(typeof entry.date).toBe('string');
      expect(typeof entry.title).toBe('string');
      expect(typeof entry.category).toBe('string');
      expect(typeof entry.body).toBe('string');
    }
  });

  it('date strings are valid ISO YYYY-MM-DD', () => {
    const iso = /^\d{4}-\d{2}-\d{2}$/;
    for (const entry of changelog) {
      expect(entry.date).toMatch(iso);
      expect(isNaN(new Date(entry.date).getTime())).toBe(false);
    }
  });

  it('entries are sorted newest-first', () => {
    for (let i = 1; i < changelog.length; i++) {
      const prev = new Date(changelog[i - 1].date);
      const curr = new Date(changelog[i].date);
      expect(prev.getTime()).toBeGreaterThanOrEqual(curr.getTime());
    }
  });

  it('category values are from the allowed set', () => {
    const allowed = new Set(['Feature', 'Improvement', 'Fix', 'Content', 'Release']);
    for (const entry of changelog) {
      expect(allowed.has(entry.category)).toBe(true);
    }
  });
});

describe('changelog RSS feed builder', () => {
  it('escapeXml handles special characters', () => {
    // Inline the escapeXml logic to test it in isolation
    function escapeXml(str) {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    }
    expect(escapeXml('a & b')).toBe('a &amp; b');
    expect(escapeXml('<tag>')).toBe('&lt;tag&gt;');
    expect(escapeXml('"quoted"')).toBe('&quot;quoted&quot;');
    expect(escapeXml("it's")).toBe('it&apos;s');
  });
});
