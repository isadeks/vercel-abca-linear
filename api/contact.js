/**
 * POST /api/contact
 *
 * Accepts a JSON body with { name, email, subject, message },
 * validates each field, and returns a JSON response.
 *
 * Success:  200  { ok: true,  message: "Message received." }
 * Invalid:  400  { ok: false, error: "<reason>" }
 * Wrong method: 405  { ok: false, error: "Method not allowed" }
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate({ name, email, subject, message }) {
  if (!name || !name.trim()) {
    return 'Name is required.';
  }
  if (!email || !EMAIL_RE.test(email.trim())) {
    return 'A valid email address is required.';
  }
  if (!subject || !subject.trim()) {
    return 'Please select a subject.';
  }
  if (!message || !message.trim()) {
    return 'Message is required.';
  }
  return null;
}

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  const { name, email, subject, message } = req.body ?? {};
  const validationError = validate({ name, email, subject, message });

  if (validationError) {
    res.status(400).json({ ok: false, error: validationError });
    return;
  }

  // In a real deployment this is where you would send an email (e.g. via
  // Resend, SendGrid, or Nodemailer). For now we simply acknowledge receipt.
  res.status(200).json({ ok: true, message: 'Message received. We\'ll be in touch within five working days.' });
}
