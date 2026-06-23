/**
 * email-templates.js
 *
 * Renders email content (subject + HTML body) for each notification type.
 * Pure functions — no I/O, no side-effects. Consumed by email-queue.js and
 * the /api/notify/email endpoint.
 *
 * Supported template names:
 *   booking_confirmation   — sent after a booking is created
 *   booking_cancellation   — sent after a booking is cancelled
 *   booking_reminder       — sent 24 h before check-in
 *   password_reset         — account password-reset link
 */

/** @typedef {{ subject: string, html: string, text: string }} RenderedEmail */

/**
 * Escapes HTML special characters in a string value so it is safe to embed
 * inside an HTML template.
 * @param {unknown} value
 * @returns {string}
 */
function esc(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Returns the URL only when it uses an allowed scheme (http / https).
 * Falls back to '#' for anything suspicious (e.g. javascript:, data:, vbscript:).
 * @param {unknown} value
 * @returns {string}
 */
function safeUrl(value) {
  const raw = String(value === null || value === undefined ? '' : value).trim();
  if (/^https?:\/\//i.test(raw)) return raw;
  return '#';
}

/**
 * Wraps rendered content in a minimal, consistent HTML shell.
 * @param {string} title
 * @param {string} bodyHtml
 * @returns {string}
 */
function htmlShell(title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 24px; }
    h1   { color: #1a5276; font-size: 22px; }
    p    { line-height: 1.6; }
    .detail-table { border-collapse: collapse; width: 100%; margin: 16px 0; }
    .detail-table td { padding: 6px 10px; border-bottom: 1px solid #e0e0e0; }
    .detail-table td:first-child { font-weight: bold; width: 40%; }
    .footer { margin-top: 32px; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 12px; }
  </style>
</head>
<body>
${bodyHtml}
<div class="footer">
  <p>Wander Travel &bull; contact@wander.travel</p>
  <p>You are receiving this email because you have a booking or account with Wander Travel.</p>
</div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Template renderers
// ---------------------------------------------------------------------------

/**
 * @param {Record<string, unknown>} data
 * @returns {RenderedEmail}
 */
function bookingConfirmation(data) {
  const subject = `Booking Confirmed — ${esc(data.destination)} (Ref: ${esc(data.bookingRef)})`;
  const html = htmlShell(subject, `
    <h1>Your booking is confirmed!</h1>
    <p>Hi ${esc(data.guestName)},</p>
    <p>We're delighted to confirm your reservation at <strong>${esc(data.destination)}</strong>.</p>
    <table class="detail-table">
      <tr><td>Booking reference</td><td>${esc(data.bookingRef)}</td></tr>
      <tr><td>Check-in</td><td>${esc(data.checkIn)}</td></tr>
      <tr><td>Check-out</td><td>${esc(data.checkOut)}</td></tr>
      <tr><td>Guests</td><td>${esc(data.guests)}</td></tr>
      <tr><td>Room</td><td>${esc(data.roomType)}</td></tr>
      <tr><td>Total charged</td><td>${esc(data.totalAmount)}</td></tr>
    </table>
    <p>If you have any questions, reply to this email or contact our support team.</p>
    <p>Safe travels,<br/>The Wander Team</p>
  `);
  const text = [
    `Booking Confirmed — ${data.destination} (Ref: ${data.bookingRef})`,
    '',
    `Hi ${data.guestName},`,
    `We're delighted to confirm your reservation at ${data.destination}.`,
    '',
    `Booking reference : ${data.bookingRef}`,
    `Check-in          : ${data.checkIn}`,
    `Check-out         : ${data.checkOut}`,
    `Guests            : ${data.guests}`,
    `Room              : ${data.roomType}`,
    `Total charged     : ${data.totalAmount}`,
    '',
    'Safe travels,',
    'The Wander Team',
  ].join('\n');
  return { subject, html, text };
}

/**
 * @param {Record<string, unknown>} data
 * @returns {RenderedEmail}
 */
function bookingCancellation(data) {
  const subject = `Booking Cancelled — Ref: ${esc(data.bookingRef)}`;
  const html = htmlShell(subject, `
    <h1>Your booking has been cancelled</h1>
    <p>Hi ${esc(data.guestName)},</p>
    <p>Your reservation (ref: <strong>${esc(data.bookingRef)}</strong>) for <strong>${esc(data.destination)}</strong> has been cancelled.</p>
    <table class="detail-table">
      <tr><td>Booking reference</td><td>${esc(data.bookingRef)}</td></tr>
      <tr><td>Cancelled on</td><td>${esc(data.cancelledAt)}</td></tr>
      <tr><td>Refund amount</td><td>${esc(data.refundAmount)}</td></tr>
      <tr><td>Refund timeline</td><td>${esc(data.refundTimeline)}</td></tr>
    </table>
    <p>We're sorry to see your plans change. We hope to welcome you back soon.</p>
    <p>The Wander Team</p>
  `);
  const text = [
    `Booking Cancelled — Ref: ${data.bookingRef}`,
    '',
    `Hi ${data.guestName},`,
    `Your reservation (ref: ${data.bookingRef}) for ${data.destination} has been cancelled.`,
    '',
    `Cancelled on    : ${data.cancelledAt}`,
    `Refund amount   : ${data.refundAmount}`,
    `Refund timeline : ${data.refundTimeline}`,
    '',
    'The Wander Team',
  ].join('\n');
  return { subject, html, text };
}

/**
 * @param {Record<string, unknown>} data
 * @returns {RenderedEmail}
 */
function bookingReminder(data) {
  const subject = `Reminder: Check-in tomorrow — ${esc(data.destination)}`;
  const html = htmlShell(subject, `
    <h1>Your check-in is tomorrow!</h1>
    <p>Hi ${esc(data.guestName)},</p>
    <p>Just a friendly reminder that your stay at <strong>${esc(data.destination)}</strong> starts tomorrow.</p>
    <table class="detail-table">
      <tr><td>Booking reference</td><td>${esc(data.bookingRef)}</td></tr>
      <tr><td>Check-in</td><td>${esc(data.checkIn)}</td></tr>
      <tr><td>Check-out</td><td>${esc(data.checkOut)}</td></tr>
      <tr><td>Address</td><td>${esc(data.propertyAddress)}</td></tr>
    </table>
    <p>Have a wonderful trip!</p>
    <p>The Wander Team</p>
  `);
  const text = [
    `Reminder: Check-in tomorrow — ${data.destination}`,
    '',
    `Hi ${data.guestName},`,
    `Your stay at ${data.destination} starts tomorrow.`,
    '',
    `Booking reference : ${data.bookingRef}`,
    `Check-in          : ${data.checkIn}`,
    `Check-out         : ${data.checkOut}`,
    `Address           : ${data.propertyAddress}`,
    '',
    'Have a wonderful trip!',
    'The Wander Team',
  ].join('\n');
  return { subject, html, text };
}

/**
 * @param {Record<string, unknown>} data
 * @returns {RenderedEmail}
 */
function passwordReset(data) {
  const subject = 'Reset your Wander password';
  const html = htmlShell(subject, `
    <h1>Password reset request</h1>
    <p>Hi ${esc(data.guestName)},</p>
    <p>We received a request to reset the password for your Wander account.</p>
    <p>
      <a href="${esc(safeUrl(data.resetUrl))}" style="display:inline-block;padding:12px 24px;background:#1a5276;color:#fff;text-decoration:none;border-radius:4px;">
        Reset my password
      </a>
    </p>
    <p>This link expires in <strong>${esc(data.expiresIn ?? '1 hour')}</strong>.</p>
    <p>If you did not request a password reset, please ignore this email — your account is safe.</p>
    <p>The Wander Team</p>
  `);
  const text = [
    'Reset your Wander password',
    '',
    `Hi ${data.guestName},`,
    'We received a request to reset the password for your Wander account.',
    '',
    `Reset link (expires in ${data.expiresIn ?? '1 hour'}):`,
    String(data.resetUrl),
    '',
    'If you did not request this, please ignore this email.',
    'The Wander Team',
  ].join('\n');
  return { subject, html, text };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Known template names.
 * @readonly
 * @enum {string}
 */
export const TEMPLATES = /** @type {const} */ ({
  BOOKING_CONFIRMATION: 'booking_confirmation',
  BOOKING_CANCELLATION: 'booking_cancellation',
  BOOKING_REMINDER: 'booking_reminder',
  PASSWORD_RESET: 'password_reset',
});

const RENDERERS = {
  [TEMPLATES.BOOKING_CONFIRMATION]: bookingConfirmation,
  [TEMPLATES.BOOKING_CANCELLATION]: bookingCancellation,
  [TEMPLATES.BOOKING_REMINDER]: bookingReminder,
  [TEMPLATES.PASSWORD_RESET]: passwordReset,
};

/**
 * Renders an email template given its name and data payload.
 *
 * @param {string} templateName  One of the TEMPLATES constants.
 * @param {Record<string, unknown>} data  Template variable substitutions.
 * @returns {RenderedEmail}
 * @throws {Error} When templateName is unknown.
 */
export function renderTemplate(templateName, data) {
  const renderer = RENDERERS[templateName];
  if (!renderer) {
    throw new Error(`Unknown email template: "${templateName}". Valid templates: ${Object.values(TEMPLATES).join(', ')}`);
  }
  return renderer(data);
}
