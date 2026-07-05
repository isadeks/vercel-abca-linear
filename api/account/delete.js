/**
 * api/account/delete.js — Vercel serverless function: DELETE /api/account/delete
 *
 * Accepts a DELETE request with a JSON body containing `{ confirm: true }`.
 * Returns `{ deleted: true }` on success (mock — no real DB).
 *
 * The core logic is extracted into `handleDelete()` (named export) so tests
 * can exercise it without spinning up an HTTP server.
 */

/**
 * Validate the parsed request body and return the deletion result.
 *
 * @param {unknown} body  - parsed JSON body (or null/undefined for empty body)
 * @returns {{ deleted: true }}
 * @throws {Error} with a `status` property when validation fails
 */
export function handleDelete(body) {
  if (body === null || body === undefined || typeof body !== 'object') {
    const err = new Error('Request body is required');
    err.status = 400;
    throw err;
  }

  if (body.confirm !== true) {
    const err = new Error('Missing confirmation: body must include { "confirm": true }');
    err.status = 422;
    throw err;
  }

  return { deleted: true };
}

/**
 * Vercel serverless handler.
 *
 * @param {import('@vercel/node').VercelRequest}  req
 * @param {import('@vercel/node').VercelResponse} res
 */
export default function handler(req, res) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', 'DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = handleDelete(req.body ?? null);
    return res.status(200).json(result);
  } catch (err) {
    const status = err.status ?? 500;
    return res.status(status).json({ error: err.message });
  }
}
