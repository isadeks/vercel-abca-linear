import { describe, it, expect, vi } from 'vitest';
import handler from '../api/health.js';

describe('GET /api/health', () => {
  it('returns status OK and an ISO timestamp', () => {
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    const res = { status };

    handler({}, res);

    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledOnce();

    const payload = json.mock.calls[0][0];
    expect(payload.status).toBe('OK');
    expect(typeof payload.time).toBe('string');
    // Must be a valid ISO 8601 date string
    expect(() => new Date(payload.time).toISOString()).not.toThrow();
    expect(new Date(payload.time).toISOString()).toBe(payload.time);
  });
});
