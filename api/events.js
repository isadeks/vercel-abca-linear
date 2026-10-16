/**
 * POST /api/events — analytics event ingestion endpoint
 *
 * Accepts a JSON body matching the event schema defined in api/_lib/analytics.js,
 * records the event, and returns the stored event with its server-assigned timestamp.
 *
 * Request body (application/json):
 *   {
 *     type:       string  — required, one of VALID_EVENT_TYPES
 *     userId?:    string  — optional (one of userId/sessionId must be present)
 *     sessionId?: string  — optional (one of userId/sessionId must be present)
 *     page?:      string  — the path/URL at the time of the event
 *     metadata?:  object  — arbitrary key/value pairs
 *   }
 *
 * Responses:
 *   201  { event: NormalisedEvent }
 *   400  { error: string }
 *   405  { error: "Method Not Allowed" }
 */

import { validateEvent, recordEvent } from './_lib/analytics.js';

/**
 * Vercel serverless handler.
 *
 * @param {import('@vercel/node').VercelRequest}  req
 * @param {import('@vercel/node').VercelResponse} res
 */
export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const body = req.body ?? null;

  const result = validateEvent(body);
  if (!result.ok) {
    return res.status(400).json({ error: result.error });
  }

  const stored = recordEvent(result.event);
  return res.status(201).json({ event: stored });
}
