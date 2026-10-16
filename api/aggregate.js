/**
 * GET /api/aggregate — metrics aggregation job & read endpoint
 *
 * Dual purpose:
 *  1. Triggered by the Vercel cron schedule (vercel.json) to re-compute rollups.
 *  2. Called directly (e.g. by the dashboard) to retrieve the latest aggregated
 *     metrics without forcing a re-aggregation.
 *
 * Query parameters:
 *   ?refresh=1   Force a full re-aggregation from the raw event log before
 *                returning results. The cron job always passes this flag.
 *                Without it, the cached rollup totals are returned as-is.
 *
 * Responses:
 *   200  AggregateResult  { totalEvents, totals, daily, lastAggregatedAt }
 *   405  { error: "Method Not Allowed" }
 */

import { aggregateMetrics, getAggregates } from './_lib/analytics.js';

/**
 * Vercel serverless handler.
 *
 * @param {import('@vercel/node').VercelRequest}  req
 * @param {import('@vercel/node').VercelResponse} res
 */
export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const refresh = req.query?.refresh === '1' || req.query?.refresh === 'true';

  const result = refresh ? aggregateMetrics() : getAggregates();
  return res.status(200).json(result);
}
