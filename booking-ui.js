// booking-ui.js — framework-free controller for the Wander quote form.
//
// Wires the booking.html form to the /api/book endpoint. All request-building
// and response-parsing logic lives in the shared booking-client.js module so
// the browser and the cross-boundary test agree on the exact contract. This
// file only handles DOM concerns: reading inputs, managing UI states, focus
// management, and accessible (aria-live) feedback.

import {
  BOOK_ENDPOINT,
  buildBookRequest,
  parseBookResponse,
  renderQuoteView,
} from './booking-client.js';

const form = document.getElementById('booking-form');
const submitBtn = document.getElementById('submit-btn');
const statusRegion = document.getElementById('form-status');
const resultRegion = document.getElementById('result');

/** Show a stable loading state: disable the button, announce progress. */
function setLoading() {
  submitBtn.disabled = true;
  submitBtn.setAttribute('aria-busy', 'true');
  submitBtn.dataset.label = submitBtn.dataset.label || submitBtn.textContent;
  submitBtn.textContent = 'Getting your quote…';
  statusRegion.className = 'form-status form-status--loading';
  statusRegion.textContent = 'Contacting our booking service…';
  resultRegion.hidden = true;
}

/** Restore the button to its idle label. */
function clearLoading() {
  submitBtn.disabled = false;
  submitBtn.removeAttribute('aria-busy');
  if (submitBtn.dataset.label) submitBtn.textContent = submitBtn.dataset.label;
}

/** Escape text destined for innerHTML. */
function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Render a successful quote into the result panel and move focus to it. */
function showSuccess(view) {
  statusRegion.className = 'form-status';
  statusRegion.textContent = '';
  resultRegion.className = 'result result--success';
  resultRegion.innerHTML = `
    <p class="result__eyebrow">Your quote is ready</p>
    <h2 class="result__title">${esc(view.destinationName)}</h2>
    <dl class="result__rows">
      <div class="result__row"><dt>Nights</dt><dd>${esc(view.nights)}</dd></div>
      <div class="result__row"><dt>Subtotal</dt><dd>${esc(view.subtotal)}</dd></div>
      <div class="result__row"><dt>Tax</dt><dd>${esc(view.tax)}</dd></div>
      <div class="result__row result__row--total"><dt>Total</dt><dd>${esc(view.total)}</dd></div>
    </dl>
    <p class="result__ref">Reference: <span>${esc(view.requestId)}</span></p>
  `;
  resultRegion.hidden = false;
  resultRegion.focus();
}

/**
 * Render a message-style panel used for backend rejections (e.g. sold-out /
 * validation) and genuine network errors.
 * @param {'rejected'|'error'} kind
 * @param {string} message
 * @param {string} [requestId]
 */
function showMessage(kind, message, requestId) {
  statusRegion.className = 'form-status';
  statusRegion.textContent = '';
  resultRegion.className = `result result--${kind === 'rejected' ? 'notice' : 'error'}`;
  const heading = kind === 'rejected' ? 'We couldn’t confirm that stay' : 'Connection problem';
  const ref = requestId
    ? `<p class="result__ref">Reference: <span>${esc(requestId)}</span></p>`
    : '';
  resultRegion.innerHTML = `
    <p class="result__eyebrow">${kind === 'rejected' ? 'Availability' : 'Network'}</p>
    <h2 class="result__title">${esc(heading)}</h2>
    <p class="result__message">${esc(message)}</p>
    ${ref}
  `;
  resultRegion.hidden = false;
  resultRegion.focus();
}

async function handleSubmit(event) {
  event.preventDefault();

  const values = {
    destinationId: form.elements.destinationId.value,
    checkIn: form.elements.checkIn.value,
    checkOut: form.elements.checkOut.value,
    rooms: form.elements.rooms.value,
    guests: form.elements.guests.value,
    email: form.elements.email.value,
  };
  const requestBody = buildBookRequest(values);

  setLoading();

  let response;
  try {
    response = await fetch(BOOK_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
  } catch {
    // No response at all: a genuine network/connection failure.
    clearLoading();
    showMessage(
      'error',
      'We couldn’t reach the booking service. Check your connection and try again.',
    );
    return;
  }

  // We have an HTTP response (even a 400). Parse the body; a failure to parse
  // JSON is an unexpected-response error, not a connection failure.
  let body;
  try {
    body = await response.json();
  } catch {
    body = undefined;
  }

  clearLoading();
  const view = parseBookResponse(response.status, body);

  if (view.kind === 'success') {
    showSuccess(renderQuoteView(view.quote, view.requestId));
  } else if (view.kind === 'rejected') {
    showMessage('rejected', view.message, view.requestId);
  } else {
    showMessage('error', view.message, view.requestId);
  }
}

if (form) {
  form.addEventListener('submit', handleSubmit);
}
