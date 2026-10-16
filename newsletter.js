/*
 * newsletter.js — Wander Newsletter Signup Widget
 * ================================================
 *
 * HTML Usage:
 * -----------
 *   1. Include this script in your HTML page:
 *
 *        <!-- Load the newsletter widget -->
 *        <script src="newsletter.js"></script>
 *
 *   2. Add a container element with a unique selector, e.g.:
 *
 *        <!-- Newsletter signup container -->
 *        <div id="newsletter-widget"></div>
 *
 *   3. Call mountNewsletter() with that selector after the DOM is ready:
 *
 *        <script>
 *          document.addEventListener('DOMContentLoaded', function () {
 *            mountNewsletter('#newsletter-widget');
 *          });
 *        </script>
 *
 * Behaviour:
 *   - Renders an email input and a "Subscribe" button inside the given element.
 *   - On submit, validates the email address.
 *   - If valid, stores the email in localStorage under the key `wander_newsletter`
 *     and shows a success message.
 *   - If invalid, shows an inline error prompt.
 *   - Successive submissions update the stored value.
 */

/**
 * mountNewsletter(selector)
 *
 * Renders a newsletter signup form into the element matched by `selector`.
 * On successful submission the subscriber's email is persisted in
 * localStorage under the key `wander_newsletter`.
 *
 * @param {string} selector - A CSS selector string for the target container.
 * @returns {void}
 */
function mountNewsletter(selector) {
  var container = document.querySelector(selector);

  if (!container) {
    console.warn('mountNewsletter: no element found for selector "' + selector + '"');
    return;
  }

  // ── Build the form DOM ───────────────────────────────────────────────────

  var form = document.createElement('form');
  form.className = 'wander-newsletter-form';
  form.setAttribute('novalidate', '');

  var input = document.createElement('input');
  input.type = 'email';
  input.name = 'email';
  input.placeholder = 'your@email.com';
  input.setAttribute('aria-label', 'Email address');
  input.required = true;

  var privacy = document.createElement('small');
  privacy.className = 'wander-newsletter-privacy';
  privacy.textContent = 'We never share your email.';

  var button = document.createElement('button');
  button.type = 'submit';
  button.textContent = 'Subscribe';

  var message = document.createElement('p');
  message.className = 'wander-newsletter-message';
  message.setAttribute('aria-live', 'polite');
  message.style.display = 'none';

  form.appendChild(input);
  form.appendChild(privacy);
  form.appendChild(button);
  form.appendChild(message);
  container.appendChild(form);

  // ── Minimal inline styles ────────────────────────────────────────────────
  // Applied only when the page hasn't already defined these classes,
  // so host-page CSS can freely override everything.

  var style = document.createElement('style');
  style.textContent = [
    '.wander-newsletter-form {',
    '  display: flex;',
    '  flex-direction: column;',
    '  gap: 10px;',
    '  max-width: 400px;',
    '}',
    '.wander-newsletter-form input[type="email"] {',
    '  padding: 12px 16px;',
    '  font-size: 0.95rem;',
    '  border: 1px solid #ccc;',
    '  border-radius: 2px;',
    '  outline: none;',
    '}',
    '.wander-newsletter-form input[type="email"]:focus {',
    '  border-color: #2a7a6f;',
    '}',
    '.wander-newsletter-form button[type="submit"] {',
    '  padding: 12px 24px;',
    '  font-size: 0.9rem;',
    '  font-weight: 500;',
    '  letter-spacing: 0.08em;',
    '  text-transform: uppercase;',
    '  background: #2a7a6f;',
    '  color: #fff;',
    '  border: none;',
    '  cursor: pointer;',
    '  transition: background 0.2s;',
    '}',
    '.wander-newsletter-form button[type="submit"]:hover {',
    '  background: #22665c;',
    '}',
    '.wander-newsletter-privacy {',
    '  font-size: 0.78rem;',
    '  color: #888;',
    '  margin-top: -4px;',
    '}',
    '.wander-newsletter-message {',
    '  font-size: 0.85rem;',
    '  margin-top: 4px;',
    '}',
    '.wander-newsletter-message.success { color: #2a7a6f; }',
    '.wander-newsletter-message.error   { color: #c9624a; }',
  ].join('\n');

  document.head.appendChild(style);

  // ── Submit handler ───────────────────────────────────────────────────────

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    var email = input.value.trim();

    if (!isValidEmail(email)) {
      showMessage(message, 'Please enter a valid email address.', 'error');
      input.focus();
      return;
    }

    // Persist in localStorage
    try {
      localStorage.setItem('wander_newsletter', email);
    } catch (storageError) {
      // localStorage may be unavailable (private browsing, quota exceeded, etc.)
      console.warn('mountNewsletter: could not write to localStorage.', storageError);
    }

    showMessage(message, 'You\'re subscribed! Thank you for joining Wander.', 'success');
    input.value = '';
    input.setAttribute('disabled', '');
    button.setAttribute('disabled', '');
  });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Basic RFC 5322-inspired email format check (sufficient for client-side UX).
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Display a status message below the form.
 * @param {HTMLElement} el      - The message paragraph element.
 * @param {string}      text    - Message content.
 * @param {string}      type    - 'success' | 'error'
 */
function showMessage(el, text, type) {
  el.textContent = text;
  el.className = 'wander-newsletter-message ' + type;
  el.style.display = 'block';
}
