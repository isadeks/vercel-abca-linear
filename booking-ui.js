/**
 * booking-ui.js — Browser client for the Wander /api/book endpoint.
 *
 * No framework, no imports. Plain ES2023 module loaded from booking.html.
 *
 * Handles:
 *  - Form submission → POST /api/book
 *  - Success (200)   → renders confirmation panel
 *  - Error   (400)   → renders inline validation error list
 *  - Network error   → renders generic error message
 */

// ---------------------------------------------------------------------------
// DOM references (resolved after DOMContentLoaded)
// ---------------------------------------------------------------------------

/** @type {HTMLFormElement} */
let form;

/** @type {HTMLElement} */
let statusPanel;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Format a number as USD currency string.
 * @param {number} value
 * @returns {string}
 */
function formatUsd(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

/**
 * Format an ISO date string (YYYY-MM-DD) as a human-readable date.
 * @param {string} iso
 * @returns {string}
 */
function formatDate(iso) {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Friendly label for a destination ID.
 * @param {string} id
 * @returns {string}
 */
function destinationLabel(id) {
  const labels = {
    'wander-malibu':          'Wander Malibu',
    'wander-smoky-mountains': 'Wander Smoky Mountains',
    'wander-lake-tahoe':      'Wander Lake Tahoe',
  };
  return labels[id] ?? id;
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

/**
 * Render the success/confirmation panel.
 * @param {{ confirmationId: string, destinationId: string, startDate: string, endDate: string, rooms: number, guests: number, quote: { nights: number, roomSubtotalUsd: number, taxesUsd: number, totalUsd: number, currency: string } }} data
 */
function renderConfirmation(data) {
  const { confirmationId, destinationId, startDate, endDate, rooms, guests, quote } = data;

  statusPanel.className = 'status-panel status-panel--success';
  statusPanel.innerHTML = `
    <div class="confirmation">
      <div class="confirmation__header">
        <span class="confirmation__icon" aria-hidden="true">✓</span>
        <h2 class="confirmation__title">Booking Confirmed</h2>
        <p class="confirmation__id">Confirmation ID: <strong>${confirmationId}</strong></p>
      </div>

      <dl class="confirmation__details">
        <div class="confirmation__row">
          <dt>Destination</dt>
          <dd>${destinationLabel(destinationId)}</dd>
        </div>
        <div class="confirmation__row">
          <dt>Check-in</dt>
          <dd>${formatDate(startDate)}</dd>
        </div>
        <div class="confirmation__row">
          <dt>Check-out</dt>
          <dd>${formatDate(endDate)}</dd>
        </div>
        <div class="confirmation__row">
          <dt>Nights</dt>
          <dd>${quote.nights}</dd>
        </div>
        <div class="confirmation__row">
          <dt>Rooms</dt>
          <dd>${rooms}</dd>
        </div>
        <div class="confirmation__row">
          <dt>Guests</dt>
          <dd>${guests}</dd>
        </div>
      </dl>

      <div class="confirmation__pricing">
        <h3 class="confirmation__pricing-title">Price Summary</h3>
        <dl class="confirmation__price-rows">
          <div class="confirmation__row">
            <dt>Room subtotal</dt>
            <dd>${formatUsd(quote.roomSubtotalUsd)}</dd>
          </div>
          <div class="confirmation__row">
            <dt>Taxes &amp; fees (12%)</dt>
            <dd>${formatUsd(quote.taxesUsd)}</dd>
          </div>
          <div class="confirmation__row confirmation__row--total">
            <dt>Total</dt>
            <dd>${formatUsd(quote.totalUsd)} ${quote.currency}</dd>
          </div>
        </dl>
      </div>

      <p class="confirmation__note">A confirmation has been reserved. Please keep your confirmation ID for your records.</p>
    </div>
  `;

  statusPanel.removeAttribute('hidden');
  statusPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Hide the form after success
  form.style.display = 'none';
}

/**
 * Render a list of validation errors returned by the API.
 * @param {string[]} errors
 */
function renderErrors(errors) {
  const list = errors
    .map((e) => `<li class="error-list__item">${e}</li>`)
    .join('');

  statusPanel.className = 'status-panel status-panel--error';
  statusPanel.innerHTML = `
    <p class="status-panel__heading">Please correct the following issues:</p>
    <ul class="error-list">${list}</ul>
  `;

  statusPanel.removeAttribute('hidden');
  statusPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Render a generic network / unexpected error.
 * @param {string} message
 */
function renderNetworkError(message) {
  statusPanel.className = 'status-panel status-panel--error';
  statusPanel.innerHTML = `
    <p class="status-panel__heading">Something went wrong</p>
    <p class="status-panel__body">${message}</p>
    <p class="status-panel__body">Please try again or contact support.</p>
  `;

  statusPanel.removeAttribute('hidden');
  statusPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** Clear the status panel. */
function clearStatus() {
  statusPanel.setAttribute('hidden', '');
  statusPanel.innerHTML = '';
  statusPanel.className = 'status-panel';
}

// ---------------------------------------------------------------------------
// Submit handler
// ---------------------------------------------------------------------------

/**
 * @param {SubmitEvent} event
 */
async function handleSubmit(event) {
  event.preventDefault();
  clearStatus();

  const data = new FormData(form);

  const payload = {
    destinationId: data.get('destinationId'),
    startDate:     data.get('startDate'),
    endDate:       data.get('endDate'),
    rooms:         parseInt(data.get('rooms'), 10),
    guests:        parseInt(data.get('guests'), 10),
    email:         data.get('email').trim(),
  };

  // Disable submit while request is in-flight
  const submitBtn = form.querySelector('[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Booking…';

  try {
    const response = await fetch('/api/book', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });

    const json = await response.json();

    if (response.ok && json.ok) {
      renderConfirmation(json);
    } else if (!json.ok && Array.isArray(json.errors)) {
      renderErrors(json.errors);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Request Booking';
    } else {
      // Unexpected response shape
      renderNetworkError(`Unexpected server response (HTTP ${response.status}).`);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Request Booking';
    }
  } catch (err) {
    renderNetworkError(err.message || 'Network request failed.');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Request Booking';
  }
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  form        = document.getElementById('booking-form');
  statusPanel = document.getElementById('booking-status');

  if (!form || !statusPanel) {
    console.error('booking-ui.js: required elements #booking-form and #booking-status not found.');
    return;
  }

  form.addEventListener('submit', handleSubmit);
});
