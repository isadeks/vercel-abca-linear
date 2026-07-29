/**
 * booking-ui.js — Framework-free browser client for the Wander booking flow.
 *
 * Loaded as a plain ES module from booking.html. No imports, no build step.
 *
 * Responsibilities:
 *   - Collect the trip-quote form and POST it to /api/book using the exact
 *     field names owned by the backend contract:
 *         { destinationId, checkIn, checkOut, rooms, guests, email }
 *   - Render four visible, layout-stable states in the status panel:
 *         idle → loading → (success | error)
 *   - Success  (HTTP 200, { ok: true, requestId, quote }) → confirmation +
 *     price breakdown (nights, subtotal, tax, total, currency), verbatim.
 *   - Rejection (HTTP 4xx, { ok: false, error: { message } }) → the backend's
 *     own error string, shown verbatim — never swapped for a generic message.
 *   - Network / unexpected failure → a distinct "couldn't reach the service"
 *     state that invites a retry.
 *
 * Design rule (per the task): this page performs only lightweight required-field
 * and email-shape checks. It NEVER computes prices or decides availability.
 * Quotes, taxes, totals, and sold-out verdicts come exclusively from /api/book.
 */

const API_ENDPOINT = '/api/book';

/**
 * Friendly labels for the known destination IDs. Used only for display in the
 * confirmation panel; the value POSTed to the server is always the raw ID.
 * @type {Record<string, string>}
 */
const DESTINATION_LABELS = {
  kyoto: 'Kyoto',
  amalfi: 'Amalfi Coast',
  santorini: 'Santorini',
  patagonia: 'Patagonia',
  rajasthan: 'Rajasthan',
  norway: "Norway's Fjords",
};

// --------------------------------------------------------------------------
// Small DOM / formatting helpers
// --------------------------------------------------------------------------

/**
 * Escape a string for safe interpolation into innerHTML. Backend error
 * strings and user-provided values pass through here.
 * @param {unknown} value
 * @returns {string}
 */
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Format a number of US dollars. Falls back gracefully if the backend sends a
 * non-numeric value so we never render "$NaN".
 * @param {unknown} value
 * @param {string} [currency]
 * @returns {string}
 */
function formatMoney(value, currency = 'USD') {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value ?? '—');
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n);
  } catch {
    // Unknown currency code — show the raw amount with the code appended.
    return `${n.toFixed(2)} ${currency}`;
  }
}

/**
 * Format an ISO date (YYYY-MM-DD) as a readable, timezone-stable date.
 * @param {string} iso
 * @returns {string}
 */
function formatDate(iso) {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return String(iso ?? '');
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** @type {HTMLFormElement | null} */
let form = null;
/** @type {HTMLElement | null} */
let statusPanel = null;
/** @type {HTMLButtonElement | null} */
let submitBtn = null;

/**
 * The fields that support inline (client-side) validation feedback, in DOM
 * order so focus lands on the first offending control.
 * @type {string[]}
 */
const FIELD_IDS = ['destinationId', 'checkIn', 'checkOut', 'rooms', 'guests', 'email'];

// --------------------------------------------------------------------------
// Client-side pre-checks (intentionally minimal)
// --------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Run lightweight required-field + email-shape checks. Deliberately does NOT
 * check availability or sold-out dates — a valid-looking request is allowed
 * through so the backend can own that verdict.
 *
 * @param {Record<string, string>} values raw string values from the form
 * @returns {Record<string, string>} map of fieldId → error message (empty = OK)
 */
function validateClient(values) {
  /** @type {Record<string, string>} */
  const errors = {};

  if (!values.destinationId) errors.destinationId = 'Please choose a destination.';
  if (!values.checkIn) errors.checkIn = 'Please choose a check-in date.';
  if (!values.checkOut) errors.checkOut = 'Please choose a check-out date.';

  // Only compare dates when both are present and well-formed; the server is the
  // authority on availability, but an obviously reversed range is worth catching.
  if (values.checkIn && values.checkOut && values.checkOut <= values.checkIn) {
    errors.checkOut = 'Check-out must be after check-in.';
  }

  const rooms = Number(values.rooms);
  if (!values.rooms || !Number.isInteger(rooms) || rooms < 1) {
    errors.rooms = 'Enter 1 or more rooms.';
  }

  const guests = Number(values.guests);
  if (!values.guests || !Number.isInteger(guests) || guests < 1) {
    errors.guests = 'Enter 1 or more guests.';
  }

  if (!values.email) {
    errors.email = 'Please enter your email.';
  } else if (!EMAIL_RE.test(values.email)) {
    errors.email = 'Enter a valid email address.';
  }

  return errors;
}

/** Clear all inline field errors and their aria-invalid flags. */
function clearFieldErrors() {
  for (const id of FIELD_IDS) {
    const control = document.getElementById(id);
    const slot = document.getElementById(`err-${id}`);
    if (control) control.removeAttribute('aria-invalid');
    if (slot) slot.textContent = '';
  }
}

/**
 * Paint inline field errors and move focus to the first invalid control.
 * @param {Record<string, string>} errors
 */
function showFieldErrors(errors) {
  clearFieldErrors();
  let firstInvalid = null;
  for (const id of FIELD_IDS) {
    const msg = errors[id];
    if (!msg) continue;
    const control = document.getElementById(id);
    const slot = document.getElementById(`err-${id}`);
    if (control) control.setAttribute('aria-invalid', 'true');
    if (slot) slot.textContent = msg;
    if (!firstInvalid) firstInvalid = control;
  }
  if (firstInvalid) firstInvalid.focus();
}

// --------------------------------------------------------------------------
// Status-panel state renderers (idle / loading / success / error)
// --------------------------------------------------------------------------

/**
 * Replace the status panel contents and apply a state class.
 * @param {string} stateClass  e.g. 'result--success'
 * @param {string} html        inner markup
 * @param {boolean} [focus]    move focus to the panel (for success/error)
 */
function setPanel(stateClass, html, focus = false) {
  if (!statusPanel) return;
  statusPanel.className = `status-panel ${stateClass}`.trim();
  statusPanel.innerHTML = html;
  if (focus) statusPanel.focus();
}

/** Loading state — stable spinner, no layout shift. */
function renderLoading() {
  setPanel(
    'result--loading',
    `
      <p class="status-panel__eyebrow">Requesting</p>
      <p class="status-panel__loading">
        <span class="spinner--ink" aria-hidden="true"></span>
        Checking live availability and pricing…
      </p>
    `,
  );
}

/**
 * Success state — request ID, nights, subtotal, taxes, total, currency.
 * All figures come straight from the backend quote; nothing is recomputed.
 *
 * Backend success contract (HTTP 200):
 *   { ok: true, requestId, quote: {
 *       destinationId, destinationName, checkIn, checkOut, rooms, guests,
 *       currency, nights, nightlyRate, subtotal, tax, total, ...
 *   } }
 * The money fields (subtotal, tax, total, nightlyRate) are decimal strings.
 *
 * @param {{ requestId?: string, quote?: Record<string, unknown> }} data
 */
function renderSuccess(data) {
  const quote = data.quote ?? {};
  const currency = quote.currency ?? 'USD';
  const label =
    quote.destinationName ??
    DESTINATION_LABELS[quote.destinationId] ??
    quote.destinationId ??
    '';

  setPanel(
    'result--success',
    `
      <p class="status-panel__eyebrow">Quote confirmed</p>
      <h2 class="result-heading result-heading--ok">${escapeHtml(label)}</h2>
      <p class="conf-id">Request ID: <strong>${escapeHtml(data.requestId ?? '—')}</strong></p>

      <ul class="price-rows">
        <li><span class="label">Check-in</span><span class="value">${escapeHtml(formatDate(quote.checkIn))}</span></li>
        <li><span class="label">Check-out</span><span class="value">${escapeHtml(formatDate(quote.checkOut))}</span></li>
        <li><span class="label">Nights</span><span class="value">${escapeHtml(quote.nights ?? '—')}</span></li>
        <li><span class="label">Rooms</span><span class="value">${escapeHtml(quote.rooms ?? '—')}</span></li>
        <li><span class="label">Guests</span><span class="value">${escapeHtml(quote.guests ?? '—')}</span></li>
        <li><span class="label">Subtotal</span><span class="value">${escapeHtml(formatMoney(quote.subtotal, currency))}</span></li>
        <li><span class="label">Taxes &amp; fees</span><span class="value">${escapeHtml(formatMoney(quote.tax, currency))}</span></li>
        <li class="total"><span class="label">Total</span><span class="value">${escapeHtml(formatMoney(quote.total, currency))} ${escapeHtml(currency)}</span></li>
      </ul>

      <p class="result-note">Keep your request ID for your records. Request another quote at any time.</p>
      <p class="result-actions"><a href="destinations.html">← Back to destinations</a></p>
    `,
    true,
  );
}

/**
 * Pull a list of human-readable error strings out of a backend rejection body,
 * tolerating the shapes a rejection can realistically take. A 4xx means the
 * service was reached and rejected the request, so we must surface *something*
 * meaningful rather than fall through to the generic "connection problem"
 * state. Recognised shapes:
 *   - { error: { reason, message } }    (the /api/book contract)
 *   - { error: "a" }                    (single-string error body)
 *   - { errors: ["a", "b"] }            (array of strings)
 *   - { errors: [{ message: "a" }] }    (array of objects with a message field)
 *   - { errors: { field: "msg", … } }   (field → message map)
 *   - { message: "a" }                  (single-message body)
 *
 * @param {Record<string, unknown>} json
 * @returns {string[]} zero or more error strings
 */
function extractBackendErrors(json) {
  const out = [];

  const push = (v) => {
    if (v == null) return;
    if (typeof v === 'string') {
      const s = v.trim();
      if (s) out.push(s);
    } else if (typeof v === 'object') {
      // Common nested shapes: { message } / { msg } / { detail }.
      const nested = v.message ?? v.msg ?? v.detail;
      if (typeof nested === 'string' && nested.trim()) out.push(nested.trim());
    }
  };

  const { errors } = json;
  if (Array.isArray(errors)) {
    errors.forEach(push);
  } else if (errors && typeof errors === 'object') {
    Object.values(errors).forEach(push);
  } else if (typeof errors === 'string') {
    push(errors);
  }

  // Single-message fallbacks. The /api/book contract nests the human-readable
  // string under `error.message`; push() unwraps both string and object forms.
  if (out.length === 0) {
    push(json.error);
    push(json.message);
  }

  return out;
}

/**
 * Error state for backend rejections — renders the returned `errors` verbatim.
 * These are the server's authoritative validation / availability messages and
 * are NOT replaced with a generic client message.
 *
 * @param {string[]} errors
 */
function renderBackendErrors(errors) {
  const items = errors
    .map((e) => `<li>${escapeHtml(e)}</li>`)
    .join('');
  setPanel(
    'result--error',
    `
      <p class="status-panel__eyebrow">Not available</p>
      <h2 class="error-heading">We couldn&rsquo;t confirm this trip</h2>
      <ul class="error-list">${items}</ul>
      <p class="error-retry-hint">Adjust your details above and request the quote again.</p>
    `,
    true,
  );
}

/**
 * Network / unexpected-failure state — distinct from a backend rejection so a
 * transient connectivity problem is never mistaken for a validation error.
 * @param {string} [detail]
 */
function renderNetworkError(detail) {
  setPanel(
    'result--error',
    `
      <p class="status-panel__eyebrow">Connection problem</p>
      <h2 class="error-heading">We couldn&rsquo;t reach the booking service</h2>
      <p class="error-body">${escapeHtml(detail || 'Please check your connection and try again.')}</p>
      <p class="error-retry-hint">Your details are still filled in — just request the quote again.</p>
    `,
    true,
  );
}

// --------------------------------------------------------------------------
// Submit handling
// --------------------------------------------------------------------------

/** Toggle the submit button between idle and in-flight looks. */
function setSubmitting(isSubmitting) {
  if (!submitBtn) return;
  submitBtn.disabled = isSubmitting;
  submitBtn.innerHTML = isSubmitting
    ? '<span class="spinner" aria-hidden="true"></span> Requesting…'
    : 'Request quote';
}

/**
 * @param {SubmitEvent} event
 */
async function handleSubmit(event) {
  event.preventDefault();
  if (!form) return;

  const data = new FormData(form);
  const values = {
    destinationId: String(data.get('destinationId') ?? '').trim(),
    checkIn: String(data.get('checkIn') ?? '').trim(),
    checkOut: String(data.get('checkOut') ?? '').trim(),
    rooms: String(data.get('rooms') ?? '').trim(),
    guests: String(data.get('guests') ?? '').trim(),
    email: String(data.get('email') ?? '').trim(),
  };

  // Lightweight client checks only.
  const clientErrors = validateClient(values);
  if (Object.keys(clientErrors).length > 0) {
    showFieldErrors(clientErrors);
    return;
  }
  clearFieldErrors();

  // Build the exact payload the backend expects. Numbers are sent as numbers.
  const payload = {
    destinationId: values.destinationId,
    checkIn: values.checkIn,
    checkOut: values.checkOut,
    rooms: Number(values.rooms),
    guests: Number(values.guests),
    email: values.email,
  };

  setSubmitting(true);
  renderLoading();

  let response;
  try {
    response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    // Genuine network failure (offline, DNS, CORS, aborted, …).
    renderNetworkError(err && err.message ? err.message : undefined);
    setSubmitting(false);
    return;
  }

  // Parse the body defensively — a proxy or crash could return non-JSON.
  let json = null;
  let parseFailed = false;
  try {
    json = await response.json();
  } catch {
    parseFailed = true;
  }

  setSubmitting(false);

  if (parseFailed || json === null || typeof json !== 'object') {
    renderNetworkError(`The booking service returned an unreadable response (HTTP ${response.status}).`);
    return;
  }

  // Success: a 2xx with the contract's ok:true flag. Trust its figures verbatim.
  if (response.ok && json.ok === true) {
    renderSuccess(json);
    return;
  }

  // Backend rejection. A 4xx (or an explicit ok:false) means the service WAS
  // reached and deliberately rejected the request — this is a validation /
  // availability verdict, never a connection problem. Surface the server's own
  // messages verbatim, tolerating the shapes a rejection body can take.
  const isRejection =
    json.ok === false || (response.status >= 400 && response.status < 500);
  if (isRejection) {
    const backendErrors = extractBackendErrors(json);
    if (backendErrors.length > 0) {
      renderBackendErrors(backendErrors);
    } else {
      // Rejected, but we couldn't find any message to show. Still frame it as a
      // rejection (not a connection problem) so the user knows to adjust input.
      renderBackendErrors([
        `The booking service declined this request (HTTP ${response.status}).`,
      ]);
    }
    return;
  }

  // A 2xx without ok:true, or a 5xx — genuinely unexpected/service-side. Treat
  // it as a service problem rather than a fabricated validation message.
  renderNetworkError(`Unexpected response from the booking service (HTTP ${response.status}).`);
}

// --------------------------------------------------------------------------
// Init
// --------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  form = /** @type {HTMLFormElement} */ (document.getElementById('booking-form'));
  statusPanel = document.getElementById('booking-status');
  submitBtn = /** @type {HTMLButtonElement} */ (document.getElementById('submit-btn'));

  if (!form || !statusPanel || !submitBtn) {
    console.error('booking-ui.js: required elements not found (#booking-form, #booking-status, #submit-btn).');
    return;
  }

  form.addEventListener('submit', handleSubmit);
});
