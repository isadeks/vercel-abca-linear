// Vercel serverless ES-module function — POST /api/preferences
//
// Accepts a JSON body with a single { key, value } pair and persists it to
// the shared in-memory preferences Map imported from get.js. Returns a 200
// JSON acknowledgement on success.
//
// Validation rules:
//   - Request method must be POST (405 otherwise).
//   - Body must be valid JSON (400 on parse failure).
//   - Body must be a plain object (400 otherwise).
//   - `key` must be a non-empty string (400 otherwise).
//   - `value` must be present (i.e. the property must exist on the body) (400 otherwise).

import { preferences } from './get.js';

/**
 * POST /api/preferences
 *
 * @param {import('@vercel/node').VercelRequest}  req
 * @param {import('@vercel/node').VercelResponse} res
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  // Parse body — Vercel populates req.body when the content-type is
  // application/json; in tests we pass a plain object directly.
  let body = req.body;

  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      res.status(400).json({ error: 'Invalid JSON body' });
      return;
    }
  }

  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    res.status(400).json({ error: 'Body must be a JSON object' });
    return;
  }

  const { key, value } = body;

  if (typeof key !== 'string' || key.trim() === '') {
    res.status(400).json({ error: '`key` must be a non-empty string' });
    return;
  }

  if (!('value' in body)) {
    res.status(400).json({ error: '`value` is required' });
    return;
  }

  preferences.set(key, value);

  res.status(200).json({ ok: true, key, value });
}
