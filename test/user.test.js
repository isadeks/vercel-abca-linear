import { describe, it, expect, vi } from 'vitest';
import handler from '../api/user.js';

describe('GET /api/user', () => {
  it('responds 200 with a user object containing name and avatarUrl', () => {
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    const res = { status };

    handler({}, res);

    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledOnce();

    const user = json.mock.calls[0][0];
    expect(typeof user.name).toBe('string');
    expect(user.name.length).toBeGreaterThan(0);
    expect(typeof user.avatarUrl).toBe('string');
    expect(user.avatarUrl).toMatch(/^https?:\/\//);
  });

  it('includes email and memberSince fields', () => {
    const json = vi.fn();
    const res = { status: vi.fn(() => ({ json })) };

    handler({}, res);

    const user = json.mock.calls[0][0];
    expect(typeof user.email).toBe('string');
    expect(user.email).toContain('@');
    expect(typeof user.memberSince).toBe('string');
  });
});
