import { describe, it, expect } from 'vitest';
import {
  formatConfirmation,
  formatCancellation,
} from '../api/_lib/helpers.js';

describe('helpers', () => {
  describe('formatConfirmation', () => {
    it('returns a confirmation message for a destination and date', () => {
      expect(formatConfirmation('Paris', '2026-08-01')).toBe(
        'Booking confirmed for Paris on 2026-08-01.',
      );
    });
  });

  describe('formatCancellation', () => {
    it('returns a cancellation message for a destination and date', () => {
      expect(formatCancellation('Paris', '2026-08-01')).toBe(
        'Booking cancelled for Paris on 2026-08-01.',
      );
    });
  });
});
