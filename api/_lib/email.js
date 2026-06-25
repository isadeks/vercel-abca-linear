/**
 * Email service — stubbed for now.
 *
 * In production swap this module with a real provider (Resend, SendGrid, SES,
 * Postmark, etc.) by implementing the same sendPasswordResetEmail interface.
 * The stub logs the reset link to stdout so it is visible in local dev and
 * Vercel function logs without sending any real mail.
 *
 * When SMTP_ENABLED=true the function would delegate to the real provider;
 * that wiring is left as a TODO for the infrastructure team.
 */

/**
 * Send (or stub-send) a password-reset email.
 *
 * @param {{ to: string, resetLink: string, expiresAt: number }} opts
 * @returns {Promise<void>}
 */
export async function sendPasswordResetEmail({ to, resetLink, expiresAt }) {
  if (!to || !resetLink) {
    throw new Error('to and resetLink are required');
  }

  const expiryStr = new Date(expiresAt).toUTCString();

  // TODO: Replace with real email provider in production.
  console.info(
    '[email] password-reset link for %s (expires %s): %s',
    to,
    expiryStr,
    resetLink,
  );

  // Simulate async I/O latency so callers don't special-case the stub.
  await Promise.resolve();
}
