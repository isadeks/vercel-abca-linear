/**
 * search.js — search, filter, and sort the product catalog.
 *
 * searchProducts(catalog, params) → Product[]
 *
 * params:
 *   q           – full-text query string (matches name + description, case-insensitive)
 *   category    – 'tour' | 'accommodation' | 'activity'  (omit for all)
 *   minPrice    – lower bound (inclusive), numeric
 *   maxPrice    – upper bound (inclusive), numeric
 *   sort        – 'relevance' (default) | 'price_asc' | 'price_desc' | 'date_asc' | 'date_desc'
 */

/**
 * Returns true when the product text fields contain every whitespace-separated
 * token in the query string (case-insensitive, substring match).
 *
 * @param {object} product
 * @param {string} query
 * @returns {boolean}
 */
function matchesQuery(product, query) {
  if (!query || query.trim() === '') return true;

  const haystack = `${product.name} ${product.description}`.toLowerCase();
  const tokens = query.trim().toLowerCase().split(/\s+/);
  return tokens.every((token) => haystack.includes(token));
}

/**
 * Search, filter, and sort the catalog.
 *
 * @param {object[]} catalog   – array of product objects
 * @param {object}   params    – search parameters (all optional)
 * @param {string}   [params.q]
 * @param {string}   [params.category]
 * @param {number}   [params.minPrice]
 * @param {number}   [params.maxPrice]
 * @param {string}   [params.sort='relevance']
 * @returns {object[]} matching products in the requested order
 */
export function searchProducts(catalog, params = {}) {
  const { q = '', category, minPrice, maxPrice, sort = 'relevance' } = params;

  // ── Filter ────────────────────────────────────────────────────────────────
  let results = catalog.filter((product) => {
    if (!matchesQuery(product, q)) return false;
    if (category && product.category !== category) return false;
    if (minPrice !== undefined && product.price < minPrice) return false;
    if (maxPrice !== undefined && product.price > maxPrice) return false;
    return true;
  });

  // ── Sort ──────────────────────────────────────────────────────────────────
  switch (sort) {
    case 'price_asc':
      results = results.slice().sort((a, b) => a.price - b.price);
      break;
    case 'price_desc':
      results = results.slice().sort((a, b) => b.price - a.price);
      break;
    case 'date_asc':
      results = results.slice().sort((a, b) => a.date.localeCompare(b.date));
      break;
    case 'date_desc':
      results = results.slice().sort((a, b) => b.date.localeCompare(a.date));
      break;
    case 'relevance':
    default:
      // Preserve catalog order (stable — no additional sort needed)
      break;
  }

  return results;
}
