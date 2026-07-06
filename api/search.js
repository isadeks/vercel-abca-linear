/**
 * Vercel serverless function — GET /api/search
 *
 * Query parameters:
 *   q           – full-text search (name + description)
 *   category    – 'tour' | 'accommodation' | 'activity'
 *   minPrice    – minimum price (inclusive), numeric
 *   maxPrice    – maximum price (inclusive), numeric
 *   sort        – 'relevance' (default) | 'price_asc' | 'price_desc'
 *                  | 'date_asc' | 'date_desc'
 *
 * Response (200):
 *   { "results": Product[], "total": number }
 *
 * Response (400):
 *   { "error": string }
 *
 * Only GET is accepted; other methods return 405.
 */

import { products } from './_lib/catalog.js';
import { searchProducts } from './_lib/search.js';

const VALID_CATEGORIES = new Set(['tour', 'accommodation', 'activity']);
const VALID_SORTS = new Set([
  'relevance',
  'price_asc',
  'price_desc',
  'date_asc',
  'date_desc',
]);

export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { q, category, minPrice, maxPrice, sort } = req.query;

  // ── Validate parameters ───────────────────────────────────────────────────
  if (category !== undefined && !VALID_CATEGORIES.has(category)) {
    return res.status(400).json({
      error: `Invalid category "${category}". Must be one of: ${[...VALID_CATEGORIES].join(', ')}.`,
    });
  }

  if (sort !== undefined && !VALID_SORTS.has(sort)) {
    return res.status(400).json({
      error: `Invalid sort "${sort}". Must be one of: ${[...VALID_SORTS].join(', ')}.`,
    });
  }

  const parsedMin = minPrice !== undefined ? Number(minPrice) : undefined;
  const parsedMax = maxPrice !== undefined ? Number(maxPrice) : undefined;

  if (parsedMin !== undefined && !Number.isFinite(parsedMin)) {
    return res.status(400).json({ error: 'minPrice must be a valid number.' });
  }
  if (parsedMax !== undefined && !Number.isFinite(parsedMax)) {
    return res.status(400).json({ error: 'maxPrice must be a valid number.' });
  }
  if (
    parsedMin !== undefined &&
    parsedMax !== undefined &&
    parsedMin > parsedMax
  ) {
    return res
      .status(400)
      .json({ error: 'minPrice must not be greater than maxPrice.' });
  }

  // ── Execute search ────────────────────────────────────────────────────────
  const results = searchProducts(products, {
    q,
    category,
    minPrice: parsedMin,
    maxPrice: parsedMax,
    sort,
  });

  return res.status(200).json({ results, total: results.length });
}
