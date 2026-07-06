import { describe, it, expect, vi } from 'vitest';
import handler from '../api/notifications.js';

describe('GET /api/notifications', () => {
  it('responds 200 with an array of notifications', () => {
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    const res = { status };

    handler({}, res);

    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledOnce();

    const notifications = json.mock.calls[0][0];
    expect(Array.isArray(notifications)).toBe(true);
    expect(notifications.length).toBeGreaterThan(0);
  });

  it('each notification has id, message, timestamp, and read fields', () => {
    const json = vi.fn();
    const res = { status: vi.fn(() => ({ json })) };

    handler({}, res);

    const notifications = json.mock.calls[0][0];
    for (const notif of notifications) {
      expect(typeof notif.id).toBe('string');
      expect(notif.id.length).toBeGreaterThan(0);
      expect(typeof notif.message).toBe('string');
      expect(notif.message.length).toBeGreaterThan(0);
      expect(typeof notif.timestamp).toBe('string');
      expect(notif.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(typeof notif.read).toBe('boolean');
    }
  });

  it('includes both read and unread notifications', () => {
    const json = vi.fn();
    const res = { status: vi.fn(() => ({ json })) };

    handler({}, res);

    const notifications = json.mock.calls[0][0];
    const hasRead = notifications.some(n => n.read === true);
    const hasUnread = notifications.some(n => n.read === false);
    expect(hasRead).toBe(true);
    expect(hasUnread).toBe(true);
  });
});
