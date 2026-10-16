import { describe, it, expect } from 'vitest';
import { renderTemplate, TEMPLATES } from '../api/_lib/email-templates.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const confirmationData = {
  guestName: 'Alice Dupont',
  destination: 'Santorini, Greece',
  bookingRef: 'WND-0042',
  checkIn: '2026-07-15',
  checkOut: '2026-07-22',
  guests: 2,
  roomType: 'Ocean Suite',
  totalAmount: '$2,450.00',
};

const cancellationData = {
  guestName: 'Bob Martin',
  destination: 'Kyoto, Japan',
  bookingRef: 'WND-0099',
  cancelledAt: '2026-06-20',
  refundAmount: '$1,200.00',
  refundTimeline: '5–7 business days',
};

const reminderData = {
  guestName: 'Carol Smith',
  destination: 'Patagonia, Argentina',
  bookingRef: 'WND-0143',
  checkIn: '2026-06-24',
  checkOut: '2026-07-01',
  propertyAddress: '123 Andes Road, El Calafate',
};

const passwordResetData = {
  guestName: 'Dave Lee',
  resetUrl: 'https://wander.travel/reset?token=abc123',
  expiresIn: '2 hours',
};

// ---------------------------------------------------------------------------
// booking_confirmation
// ---------------------------------------------------------------------------

describe('renderTemplate — booking_confirmation', () => {
  it('returns subject, html, and text fields', () => {
    const result = renderTemplate(TEMPLATES.BOOKING_CONFIRMATION, confirmationData);
    expect(result).toHaveProperty('subject');
    expect(result).toHaveProperty('html');
    expect(result).toHaveProperty('text');
  });

  it('subject includes booking ref and destination', () => {
    const { subject } = renderTemplate(TEMPLATES.BOOKING_CONFIRMATION, confirmationData);
    expect(subject).toContain('WND-0042');
    expect(subject).toContain('Santorini, Greece');
  });

  it('HTML includes guest name and booking details', () => {
    const { html } = renderTemplate(TEMPLATES.BOOKING_CONFIRMATION, confirmationData);
    expect(html).toContain('Alice Dupont');
    expect(html).toContain('WND-0042');
    expect(html).toContain('Ocean Suite');
    expect(html).toContain('$2,450.00');
  });

  it('plain-text includes all key fields', () => {
    const { text } = renderTemplate(TEMPLATES.BOOKING_CONFIRMATION, confirmationData);
    expect(text).toContain('WND-0042');
    expect(text).toContain('2026-07-15');
    expect(text).toContain('2026-07-22');
  });

  it('escapes HTML special characters in data', () => {
    const { html } = renderTemplate(TEMPLATES.BOOKING_CONFIRMATION, {
      ...confirmationData,
      guestName: '<script>alert("xss")</script>',
    });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

// ---------------------------------------------------------------------------
// booking_cancellation
// ---------------------------------------------------------------------------

describe('renderTemplate — booking_cancellation', () => {
  it('subject includes booking ref', () => {
    const { subject } = renderTemplate(TEMPLATES.BOOKING_CANCELLATION, cancellationData);
    expect(subject).toContain('WND-0099');
  });

  it('HTML contains refund information', () => {
    const { html } = renderTemplate(TEMPLATES.BOOKING_CANCELLATION, cancellationData);
    expect(html).toContain('$1,200.00');
    expect(html).toContain('5–7 business days');
  });

  it('plain-text contains refund information', () => {
    const { text } = renderTemplate(TEMPLATES.BOOKING_CANCELLATION, cancellationData);
    expect(text).toContain('$1,200.00');
  });
});

// ---------------------------------------------------------------------------
// booking_reminder
// ---------------------------------------------------------------------------

describe('renderTemplate — booking_reminder', () => {
  it('subject mentions destination', () => {
    const { subject } = renderTemplate(TEMPLATES.BOOKING_REMINDER, reminderData);
    expect(subject).toContain('Patagonia, Argentina');
  });

  it('HTML contains address', () => {
    const { html } = renderTemplate(TEMPLATES.BOOKING_REMINDER, reminderData);
    expect(html).toContain('123 Andes Road');
  });
});

// ---------------------------------------------------------------------------
// password_reset
// ---------------------------------------------------------------------------

describe('renderTemplate — password_reset', () => {
  it('subject is password reset wording', () => {
    const { subject } = renderTemplate(TEMPLATES.PASSWORD_RESET, passwordResetData);
    expect(subject.toLowerCase()).toContain('password');
  });

  it('HTML contains the reset URL as an anchor', () => {
    const { html } = renderTemplate(TEMPLATES.PASSWORD_RESET, passwordResetData);
    expect(html).toContain('https://wander.travel/reset?token=abc123');
  });

  it('replaces a malicious reset URL with "#"', () => {
    const { html } = renderTemplate(TEMPLATES.PASSWORD_RESET, {
      ...passwordResetData,
      resetUrl: 'javascript:alert(1)',
    });
    // safeUrl() strips non-http(s) schemes; the href must be "#".
    expect(html).not.toContain('javascript:');
    expect(html).toContain('href="#"');
  });

  it('expiresIn defaults to "1 hour" when not provided', () => {
    const { text } = renderTemplate(TEMPLATES.PASSWORD_RESET, {
      guestName: 'Eve',
      resetUrl: 'https://wander.travel/reset?token=xyz',
    });
    expect(text).toContain('1 hour');
  });
});

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

describe('renderTemplate — unknown template', () => {
  it('throws a descriptive error', () => {
    expect(() => renderTemplate('nonexistent_template', {})).toThrow(
      /Unknown email template/,
    );
  });

  it('error message lists valid template names', () => {
    let msg = '';
    try {
      renderTemplate('bad', {});
    } catch (e) {
      msg = e.message;
    }
    expect(msg).toContain('booking_confirmation');
    expect(msg).toContain('password_reset');
  });
});
