import { describe, it, expect } from 'vitest';
import {
  formatConfirmation,
  formatCancellation,
  formatModification,
} from '../api/_lib/helpers.js';

describe('formatConfirmation', () => {
  it('returns a confirmation message for a destination and date', () => {
    expect(formatConfirmation('Paris', '2026-08-01')).toBe(
      'Booking confirmed for Paris on 2026-08-01.',
    );
  });

  it('interpolates destination and date correctly', () => {
    expect(formatConfirmation('Kyoto', '2026-12-25')).toBe(
      'Booking confirmed for Kyoto on 2026-12-25.',
    );
  });
});

describe('formatCancellation', () => {
  it('returns a cancellation message for a destination and date', () => {
    expect(formatCancellation('Paris', '2026-08-01')).toBe(
      'Booking cancelled for Paris on 2026-08-01.',
    );
  });

  it('interpolates destination and date correctly', () => {
    expect(formatCancellation('Rome', '2026-09-10')).toBe(
      'Booking cancelled for Rome on 2026-09-10.',
    );
  });
});

describe('formatModification', () => {
  it('returns a modification message with old and new dates', () => {
    expect(formatModification('Barcelona', '2026-07-01', '2026-07-15')).toBe(
      'Booking for Barcelona changed from 2026-07-01 to 2026-07-15.',
    );
  });

  it('includes the destination and both dates', () => {
    const result = formatModification('Tokyo', '2026-01-10', '2026-01-20');
    expect(result).toContain('Tokyo');
    expect(result).toContain('2026-01-10');
    expect(result).toContain('2026-01-20');
  });
});
