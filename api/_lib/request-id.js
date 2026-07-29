// request-id.js — request correlation ids.
//
// Prefers an inbound correlation header (so a caller-provided id flows through
// logs and the response), otherwise mints a fresh one. Framework-free.

import { randomUUID } from 'node:crypto';

/**
 * Resolve the request id for a call. Honors an inbound `x-request-id` header
 * when present and well-formed; otherwise generates a new UUID.
 *
 * @param {Record<string, unknown> | undefined} headers Lowercased header map.
 * @returns {string}
 */
export function resolveRequestId(headers) {
  const inbound = headers && headers['x-request-id'];
  if (typeof inbound === 'string') {
    const trimmed = inbound.trim();
    // Guard against header injection / unbounded values.
    if (trimmed.length > 0 && trimmed.length <= 200 && /^[\w.-]+$/.test(trimmed)) {
      return trimmed;
    }
  }
  return randomUUID();
}
