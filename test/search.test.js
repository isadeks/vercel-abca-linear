import { describe, it, expect } from 'vitest';
import { filterPages, PAGES } from '../search.js';

describe('filterPages', () => {
  it('returns empty array for a blank query', () => {
    expect(filterPages('')).toEqual([]);
  });

  it('returns empty array for whitespace-only query', () => {
    expect(filterPages('   ')).toEqual([]);
  });

  it('matches by title (case-insensitive)', () => {
    const results = filterPages('kyoto');
    expect(results.length).toBe(1);
    expect(results[0].title).toBe('Kyoto');
  });

  it('matches by title regardless of case', () => {
    const results = filterPages('KYOTO');
    expect(results.length).toBe(1);
    expect(results[0].title).toBe('Kyoto');
  });

  it('matches by region', () => {
    const results = filterPages('japan');
    expect(results.length).toBe(1);
    expect(results[0].title).toBe('Kyoto');
  });

  it('matches by description', () => {
    const results = filterPages('cherry blossom');
    expect(results.length).toBe(1);
    expect(results[0].title).toBe('Kyoto');
  });

  it('returns multiple matches for a broad query', () => {
    // 'destination' matches "All Destinations" (title) and Quiz (description has "Destination finder")
    const results = filterPages('destination');
    expect(results.length).toBeGreaterThan(1);
  });

  it('returns no matches for a nonsense query', () => {
    expect(filterPages('xyzxyzxyz')).toEqual([]);
  });

  it('searches the default PAGES list when no pages argument is given', () => {
    const results = filterPages('norway');
    expect(results.length).toBe(1);
    expect(results[0].url).toBe('norway-guide.html');
  });

  it('accepts a custom pages list', () => {
    const custom = [
      { title: 'Test Page', url: 'test.html', region: 'Fantasy', description: 'A test' },
    ];
    const results = filterPages('fantasy', custom);
    expect(results.length).toBe(1);
    expect(results[0].title).toBe('Test Page');
  });

  it('returns partial-word matches', () => {
    const results = filterPages('Amal');
    expect(results.some(p => p.title === 'Amalfi Coast')).toBe(true);
  });

  it('PAGES list covers all guide pages', () => {
    const guideUrls = PAGES.map(p => p.url).filter(u => u.endsWith('-guide.html'));
    expect(guideUrls).toContain('amalfi-guide.html');
    expect(guideUrls).toContain('kyoto-guide.html');
    expect(guideUrls).toContain('santorini-guide.html');
    expect(guideUrls).toContain('patagonia-guide.html');
    expect(guideUrls).toContain('rajasthan-guide.html');
    expect(guideUrls).toContain('norway-guide.html');
  });
});
