import { describe, it, expect } from 'vitest';
import { products } from '../api/_lib/catalog.js';
import { searchProducts } from '../api/_lib/search.js';

// ── Catalog sanity checks ────────────────────────────────────────────────────

describe('catalog', () => {
  it('exports a non-empty product array', () => {
    expect(Array.isArray(products)).toBe(true);
    expect(products.length).toBeGreaterThan(0);
  });

  it('every product has required fields with correct types', () => {
    for (const p of products) {
      expect(typeof p.id).toBe('string');
      expect(typeof p.name).toBe('string');
      expect(typeof p.description).toBe('string');
      expect(['tour', 'accommodation', 'activity']).toContain(p.category);
      expect(typeof p.price).toBe('number');
      expect(p.price).toBeGreaterThanOrEqual(0);
      expect(typeof p.date).toBe('string');
      // ISO date format YYYY-MM-DD
      expect(p.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('all product ids are unique', () => {
    const ids = products.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ── searchProducts unit tests ────────────────────────────────────────────────

describe('searchProducts — empty / no-op', () => {
  it('returns all products when called with no params', () => {
    const results = searchProducts(products, {});
    expect(results.length).toBe(products.length);
  });

  it('returns all products for an empty query string', () => {
    const results = searchProducts(products, { q: '' });
    expect(results.length).toBe(products.length);
  });

  it('returns all products for a whitespace-only query', () => {
    const results = searchProducts(products, { q: '   ' });
    expect(results.length).toBe(products.length);
  });

  it('returns empty array when catalog is empty', () => {
    const results = searchProducts([], { q: 'tour' });
    expect(results).toEqual([]);
  });
});

// ── Full-text search ─────────────────────────────────────────────────────────

describe('searchProducts — full-text search', () => {
  it('matches against product name (case-insensitive)', () => {
    const results = searchProducts(products, { q: 'santorini' });
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      const combined = `${r.name} ${r.description}`.toLowerCase();
      expect(combined).toContain('santorini');
    }
  });

  it('matches against product description', () => {
    const results = searchProducts(products, { q: 'caldera' });
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      const combined = `${r.name} ${r.description}`.toLowerCase();
      expect(combined).toContain('caldera');
    }
  });

  it('is case-insensitive', () => {
    const lower = searchProducts(products, { q: 'kyoto' });
    const upper = searchProducts(products, { q: 'KYOTO' });
    const mixed = searchProducts(products, { q: 'KyOtO' });
    expect(lower.length).toBeGreaterThan(0);
    expect(upper.map((p) => p.id)).toEqual(lower.map((p) => p.id));
    expect(mixed.map((p) => p.id)).toEqual(lower.map((p) => p.id));
  });

  it('matches all tokens (AND logic) across fields', () => {
    // "kyoto temple" should hit only products containing both words
    const results = searchProducts(products, { q: 'kyoto temple' });
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      const combined = `${r.name} ${r.description}`.toLowerCase();
      expect(combined).toContain('kyoto');
      expect(combined).toContain('temple');
    }
  });

  it('returns empty when no product matches the query', () => {
    const results = searchProducts(products, { q: 'zzznonexistent999' });
    expect(results).toEqual([]);
  });

  it('partial word match within a token', () => {
    // "glacie" is a prefix of "glacier" — should still match
    const results = searchProducts(products, { q: 'glacie' });
    expect(results.length).toBeGreaterThan(0);
  });
});

// ── Category filter ──────────────────────────────────────────────────────────

describe('searchProducts — category filter', () => {
  it('filters by tour', () => {
    const results = searchProducts(products, { category: 'tour' });
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) expect(r.category).toBe('tour');
  });

  it('filters by accommodation', () => {
    const results = searchProducts(products, { category: 'accommodation' });
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) expect(r.category).toBe('accommodation');
  });

  it('filters by activity', () => {
    const results = searchProducts(products, { category: 'activity' });
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) expect(r.category).toBe('activity');
  });

  it('returns empty when no products match the category', () => {
    const tiny = [{ id: 'x', name: 'X', description: 'X', category: 'tour', price: 10, date: '2026-01-01' }];
    const results = searchProducts(tiny, { category: 'activity' });
    expect(results).toEqual([]);
  });

  it('combines category + text filters', () => {
    const results = searchProducts(products, { q: 'santorini', category: 'tour' });
    for (const r of results) {
      expect(r.category).toBe('tour');
      const combined = `${r.name} ${r.description}`.toLowerCase();
      expect(combined).toContain('santorini');
    }
  });
});

// ── Price range filter ───────────────────────────────────────────────────────

describe('searchProducts — price range filter', () => {
  it('filters by minPrice (inclusive)', () => {
    const results = searchProducts(products, { minPrice: 100 });
    for (const r of results) expect(r.price).toBeGreaterThanOrEqual(100);
  });

  it('filters by maxPrice (inclusive)', () => {
    const results = searchProducts(products, { maxPrice: 100 });
    for (const r of results) expect(r.price).toBeLessThanOrEqual(100);
  });

  it('filters by both minPrice and maxPrice', () => {
    const results = searchProducts(products, { minPrice: 80, maxPrice: 130 });
    for (const r of results) {
      expect(r.price).toBeGreaterThanOrEqual(80);
      expect(r.price).toBeLessThanOrEqual(130);
    }
  });

  it('returns empty for an out-of-range price window', () => {
    // No product costs more than 10 000
    const results = searchProducts(products, { minPrice: 10000 });
    expect(results).toEqual([]);
  });

  it('exact boundary — minPrice === maxPrice returns products at exactly that price', () => {
    const target = products[0].price;
    const results = searchProducts(products, { minPrice: target, maxPrice: target });
    for (const r of results) expect(r.price).toBe(target);
  });

  it('minPrice of 0 does not exclude anything', () => {
    const results = searchProducts(products, { minPrice: 0 });
    expect(results.length).toBe(products.length);
  });
});

// ── Sort orders ──────────────────────────────────────────────────────────────

describe('searchProducts — sort', () => {
  it('price_asc returns products in ascending price order', () => {
    const results = searchProducts(products, { sort: 'price_asc' });
    for (let i = 1; i < results.length; i++) {
      expect(results[i].price).toBeGreaterThanOrEqual(results[i - 1].price);
    }
  });

  it('price_desc returns products in descending price order', () => {
    const results = searchProducts(products, { sort: 'price_desc' });
    for (let i = 1; i < results.length; i++) {
      expect(results[i].price).toBeLessThanOrEqual(results[i - 1].price);
    }
  });

  it('date_asc returns products in ascending date order', () => {
    const results = searchProducts(products, { sort: 'date_asc' });
    for (let i = 1; i < results.length; i++) {
      expect(results[i].date >= results[i - 1].date).toBe(true);
    }
  });

  it('date_desc returns products in descending date order', () => {
    const results = searchProducts(products, { sort: 'date_desc' });
    for (let i = 1; i < results.length; i++) {
      expect(results[i].date <= results[i - 1].date).toBe(true);
    }
  });

  it('relevance (default) preserves catalog insertion order', () => {
    const results = searchProducts(products, { sort: 'relevance' });
    expect(results.map((r) => r.id)).toEqual(products.map((p) => p.id));
  });

  it('unknown sort defaults to relevance (catalog order)', () => {
    // searchProducts does not validate — unknown falls through to default
    const results = searchProducts(products, { sort: 'unknown_value' });
    expect(results.map((r) => r.id)).toEqual(products.map((p) => p.id));
  });

  it('sort does not mutate the original catalog array', () => {
    const original = products.map((p) => p.id);
    searchProducts(products, { sort: 'price_asc' });
    expect(products.map((p) => p.id)).toEqual(original);
  });
});

// ── Combined filters ─────────────────────────────────────────────────────────

describe('searchProducts — combined filters + sort', () => {
  it('text + category + price range + sort all work together', () => {
    const results = searchProducts(products, {
      q: 'tour',
      category: 'tour',
      minPrice: 50,
      maxPrice: 200,
      sort: 'price_asc',
    });
    // Verify each constraint
    for (const r of results) {
      const combined = `${r.name} ${r.description}`.toLowerCase();
      expect(combined).toContain('tour');
      expect(r.category).toBe('tour');
      expect(r.price).toBeGreaterThanOrEqual(50);
      expect(r.price).toBeLessThanOrEqual(200);
    }
    // Verify sort
    for (let i = 1; i < results.length; i++) {
      expect(results[i].price).toBeGreaterThanOrEqual(results[i - 1].price);
    }
  });
});

// ── Edge cases ───────────────────────────────────────────────────────────────

describe('searchProducts — edge cases', () => {
  it('handles missing params gracefully (all undefined)', () => {
    expect(() => searchProducts(products)).not.toThrow();
  });

  it('handles null-like falsy values for q', () => {
    const results = searchProducts(products, { q: '' });
    expect(results.length).toBe(products.length);
  });

  it('very large minPrice returns empty array', () => {
    const results = searchProducts(products, { minPrice: Number.MAX_SAFE_INTEGER });
    expect(results).toEqual([]);
  });

  it('very large maxPrice returns all products', () => {
    const results = searchProducts(products, { maxPrice: Number.MAX_SAFE_INTEGER });
    expect(results.length).toBe(products.length);
  });
});
