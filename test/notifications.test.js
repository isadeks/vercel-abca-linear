import { describe, it, expect } from 'vitest';
import {
  buildConfirmationNotification,
  buildCancellationNotification,
  buildModificationNotification,
} from '../api/_lib/notifications.js';

describe('buildConfirmationNotification', () => {
  it('returns a notification object with correct shape', () => {
    const n = buildConfirmationNotification('Alice', 'Paris', '2026-08-01');
    expect(n.type).toBe('confirmation');
    expect(n.recipient).toBe('Alice');
    expect(n.subject).toContain('Paris');
    expect(n.body).toBe('Booking confirmed for Paris on 2026-08-01.');
  });

  it('includes the destination in the subject', () => {
    const n = buildConfirmationNotification('Bob', 'Kyoto', '2026-12-25');
    expect(n.subject).toContain('Kyoto');
  });

  it('throws when guestName is missing', () => {
    expect(() => buildConfirmationNotification('', 'Paris', '2026-08-01')).toThrow(
      TypeError,
    );
  });

  it('throws when destination is missing', () => {
    expect(() => buildConfirmationNotification('Alice', '', '2026-08-01')).toThrow(
      TypeError,
    );
  });

  it('throws when date is missing', () => {
    expect(() => buildConfirmationNotification('Alice', 'Paris', '')).toThrow(
      TypeError,
    );
  });
});

describe('buildCancellationNotification', () => {
  it('returns a notification object with correct shape', () => {
    const n = buildCancellationNotification('Alice', 'Paris', '2026-08-01');
    expect(n.type).toBe('cancellation');
    expect(n.recipient).toBe('Alice');
    expect(n.subject).toContain('Paris');
    expect(n.body).toBe('Booking cancelled for Paris on 2026-08-01.');
  });

  it('throws when guestName is missing', () => {
    expect(() =>
      buildCancellationNotification('', 'Paris', '2026-08-01'),
    ).toThrow(TypeError);
  });
});

describe('buildModificationNotification', () => {
  it('returns a notification object with correct shape', () => {
    const n = buildModificationNotification(
      'Alice',
      'Barcelona',
      '2026-07-01',
      '2026-07-15',
    );
    expect(n.type).toBe('modification');
    expect(n.recipient).toBe('Alice');
    expect(n.subject).toContain('Barcelona');
    expect(n.body).toBe(
      'Booking for Barcelona changed from 2026-07-01 to 2026-07-15.',
    );
  });

  it('throws when guestName is missing', () => {
    expect(() =>
      buildModificationNotification('', 'Barcelona', '2026-07-01', '2026-07-15'),
    ).toThrow(TypeError);
  });

  it('throws when newDate is missing', () => {
    expect(() =>
      buildModificationNotification('Alice', 'Barcelona', '2026-07-01', ''),
    ).toThrow(TypeError);
  });
});
