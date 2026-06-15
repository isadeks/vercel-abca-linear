/*
 * newsletter.js — Wander Newsletter Signup Widget
 * ================================================
 *
 * Usage (HTML):
 * <!--
 *   1. Include this script in your page:
 *        <script src="newsletter.js"></script>
 *
 *   2. Add a container element where you want the form to render:
 *        <div id="newsletter-widget"></div>
 *
 *   3. Mount the widget by calling mountNewsletter with a CSS selector:
 *        <script>
 *          mountNewsletter('#newsletter-widget');
 *        </script>
 *
 *   Behaviour:
 *     - Renders an email <input> and a "Subscribe" <button> inside the target.
 *     - On valid submission, the email is saved to localStorage under the key
 *       "wander_newsletter" (persisted as a JSON array of strings).
 *     - Duplicate addresses (case-insensitive) are detected and reported.
 *     - Success / error feedback is displayed inline; no page reload occurs.
 * -->
 */

/**
 * mountNewsletter(selector)
 *
 * Mounts a newsletter signup form widget into the DOM element matched by
 * `selector`. On submission the email address is persisted to localStorage
 * under the key "wander_newsletter" (stored as a JSON array of strings).
 *
 * @param {string} selector - A CSS selector for the target container element.
 * @returns {void}
 */
function mountNewsletter(selector) {
  var container = document.querySelector(selector);
  if (!container) {
    console.warn('mountNewsletter: no element found for selector "' + selector + '"');
    return;
  }

  /* ── Build form elements ─────────────────────────────────────── */
  var form = document.createElement('form');
  form.setAttribute('novalidate', '');
  form.setAttribute('aria-label', 'Newsletter signup');
  form.style.cssText = 'display:flex;flex-direction:column;gap:10px;';

  var input = document.createElement('input');
  input.type = 'email';
  input.placeholder = 'your@email.com';
  input.setAttribute('aria-label', 'Email address');
  input.setAttribute('required', '');
  input.style.cssText = [
    'padding:14px 18px',
    'border:1px solid #e8e0d0',
    'background:#faf8f4',
    'font-family:inherit',
    'font-size:0.9rem',
    'color:#1a1714',
    'outline:none',
    'transition:border-color 0.2s',
  ].join(';');

  /* Focus highlight */
  input.addEventListener('focus', function () {
    input.style.borderColor = '#2a7a6f';
  });
  input.addEventListener('blur', function () {
    input.style.borderColor = '#e8e0d0';
  });

  var button = document.createElement('button');
  button.type = 'submit';
  button.textContent = "Subscribe — it's free";
  button.style.cssText = [
    'padding:14px 28px',
    'font-family:inherit',
    'font-size:0.78rem',
    'font-weight:500',
    'letter-spacing:0.12em',
    'text-transform:uppercase',
    'background:#2a7a6f',
    'border:1px solid #2a7a6f',
    'color:#fff',
    'cursor:pointer',
    'transition:background 0.2s,border-color 0.2s',
  ].join(';');

  button.addEventListener('mouseover', function () {
    button.style.background = '#22665c';
    button.style.borderColor = '#22665c';
  });
  button.addEventListener('mouseout', function () {
    button.style.background = '#2a7a6f';
    button.style.borderColor = '#2a7a6f';
  });

  var message = document.createElement('p');
  message.style.cssText = 'font-size:0.82rem;line-height:1.6;min-height:1.2em;';
  message.setAttribute('aria-live', 'polite');
  message.setAttribute('role', 'status');

  form.appendChild(input);
  form.appendChild(button);
  form.appendChild(message);
  container.appendChild(form);

  /* ── Submit handler ──────────────────────────────────────────── */
  form.addEventListener('submit', function (event) {
    event.preventDefault();

    var email = input.value.trim();

    /* Basic email format validation */
    var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailPattern.test(email)) {
      message.style.color = '#c9624a';
      message.textContent = 'Please enter a valid email address.';
      input.focus();
      return;
    }

    /* Read existing subscriptions from localStorage */
    var storageKey = 'wander_newsletter';
    var stored;
    try {
      stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
      if (!Array.isArray(stored)) stored = [];
    } catch (e) {
      stored = [];
    }

    /* Check for duplicate (case-insensitive) */
    var lowerEmail = email.toLowerCase();
    var alreadySubscribed = stored.some(function (entry) {
      return typeof entry === 'string' && entry.toLowerCase() === lowerEmail;
    });

    if (alreadySubscribed) {
      message.style.color = '#2a7a6f';
      message.textContent = "You're already subscribed — we'll see you in your inbox!";
      return;
    }

    /* Persist new email */
    stored.push(email);
    try {
      localStorage.setItem(storageKey, JSON.stringify(stored));
    } catch (storageError) {
      message.style.color = '#c9624a';
      message.textContent = 'Unable to save your subscription. Please try again.';
      return;
    }

    /* Success feedback */
    message.style.color = '#2a7a6f';
    message.textContent = "Thank you! You're now subscribed to Wander.";
    input.value = '';
    button.disabled = true;
    button.style.opacity = '0.6';
    button.style.cursor = 'default';
  });
}
