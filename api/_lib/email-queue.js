/**
 * email-queue.js
 *
 * In-process FIFO queue for email dispatch jobs. Keeps the /api/notify/email
 * endpoint non-blocking: the HTTP handler enqueues a job and returns 202
 * immediately; a background worker drains the queue asynchronously.
 *
 * Design notes:
 *   - Single-process (suitable for Vercel serverless — queue lives for the
 *     duration of one invocation; swap the backing store for Redis/SQS in
 *     production for cross-invocation durability).
 *   - Configurable concurrency and retry limits.
 *   - Emits structured log entries (no runtime dependencies).
 *   - Pure ESM, no external packages.
 */

/** @typedef {'pending' | 'processing' | 'sent' | 'failed'} JobStatus */

/**
 * @typedef {Object} EmailJob
 * @property {string}  id          Unique job identifier (UUID-style string).
 * @property {string}  to          Recipient email address.
 * @property {string}  subject     Pre-rendered subject line.
 * @property {string}  html        Pre-rendered HTML body.
 * @property {string}  text        Pre-rendered plain-text body.
 * @property {JobStatus} status    Current lifecycle state.
 * @property {number}  attempts    Number of dispatch attempts made so far.
 * @property {number}  maxAttempts Maximum allowed attempts before marking failed.
 * @property {number}  enqueuedAt  Unix ms timestamp when the job was created.
 * @property {number|null} processedAt  Unix ms when last attempt started.
 * @property {string|null}  error   Last error message (if any).
 */

// ---------------------------------------------------------------------------
// Simple ID generator (no external dependency)
// ---------------------------------------------------------------------------

let _seq = 0;

/**
 * Returns a collision-resistant job identifier.
 * @returns {string}
 */
function makeId() {
  _seq += 1;
  return `job_${Date.now()}_${_seq}_${Math.random().toString(36).slice(2, 8)}`;
}

// ---------------------------------------------------------------------------
// EmailQueue class
// ---------------------------------------------------------------------------

export class EmailQueue {
  /**
   * @param {object}  [opts]
   * @param {number}  [opts.maxAttempts=3]   Max delivery attempts per job.
   * @param {number}  [opts.concurrency=2]   Max parallel dispatch calls.
   * @param {(job: EmailJob) => Promise<void>} [opts.dispatcher]
   *   Async function that actually sends the email (e.g. calls SendGrid).
   *   Defaults to a no-op logger (useful in tests / dev without real SMTP).
   */
  constructor({ maxAttempts = 3, concurrency = 2, dispatcher } = {}) {
    this._maxAttempts = maxAttempts;
    this._concurrency = concurrency;
    /** @type {EmailJob[]} */
    this._queue = [];
    this._active = 0;
    this._draining = false;

    this._dispatcher = dispatcher ?? defaultDispatcher;
  }

  // -------------------------------------------------------------------------
  // Public interface
  // -------------------------------------------------------------------------

  /**
   * Adds an email job to the queue and starts draining (non-blocking).
   *
   * @param {object} params
   * @param {string} params.to
   * @param {string} params.subject
   * @param {string} params.html
   * @param {string} params.text
   * @returns {EmailJob}  The created job (status = 'pending').
   */
  enqueue({ to, subject, html, text }) {
    if (!to || !subject) {
      throw new Error('email-queue: "to" and "subject" are required.');
    }
    /** @type {EmailJob} */
    const job = {
      id: makeId(),
      to,
      subject,
      html: html ?? '',
      text: text ?? '',
      status: 'pending',
      attempts: 0,
      maxAttempts: this._maxAttempts,
      enqueuedAt: Date.now(),
      processedAt: null,
      error: null,
    };
    this._queue.push(job);
    log('enqueued', { jobId: job.id, to: job.to, subject: job.subject });
    // Kick off drain asynchronously so enqueue() always returns synchronously.
    Promise.resolve().then(() => this._drain());
    return job;
  }

  /**
   * Returns a snapshot of the current queue (copies, not live references).
   * @returns {EmailJob[]}
   */
  list() {
    return this._queue.map((j) => ({ ...j }));
  }

  /**
   * Returns jobs matching the given status.
   * @param {JobStatus} status
   * @returns {EmailJob[]}
   */
  listByStatus(status) {
    return this._queue.filter((j) => j.status === status).map((j) => ({ ...j }));
  }

  /**
   * Removes completed (sent + failed) jobs from the internal queue.
   * @returns {number} Number of jobs pruned.
   */
  prune() {
    const before = this._queue.length;
    this._queue = this._queue.filter(
      (j) => j.status !== 'sent' && j.status !== 'failed',
    );
    return before - this._queue.length;
  }

  /**
   * Returns queue statistics.
   * @returns {{ pending: number, processing: number, sent: number, failed: number, total: number }}
   */
  stats() {
    const counts = { pending: 0, processing: 0, sent: 0, failed: 0, total: 0 };
    for (const job of this._queue) {
      counts[job.status] += 1;
      counts.total += 1;
    }
    return counts;
  }

  // -------------------------------------------------------------------------
  // Internal drain loop
  // -------------------------------------------------------------------------

  /**
   * Processes pending jobs up to the concurrency limit.
   * Re-queues retryable failures.
   */
  async _drain() {
    if (this._draining) return;
    this._draining = true;

    try {
      while (this._active < this._concurrency) {
        const job = this._queue.find((j) => j.status === 'pending');
        if (!job) break;

        job.status = 'processing';
        job.processedAt = Date.now();
        this._active += 1;

        this._dispatch(job).finally(() => {
          this._active -= 1;
          // After each job settles, try to drain again.
          this._drain();
        });
      }
    } finally {
      this._draining = false;
    }
  }

  /**
   * Attempts to dispatch a single job, handling retries and failure marking.
   * @param {EmailJob} job
   */
  async _dispatch(job) {
    job.attempts += 1;
    log('dispatching', { jobId: job.id, attempt: job.attempts });

    try {
      await this._dispatcher(job);
      job.status = 'sent';
      log('sent', { jobId: job.id, to: job.to });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      job.error = message;
      log('dispatch_error', { jobId: job.id, attempt: job.attempts, error: message });

      if (job.attempts < job.maxAttempts) {
        // Retry: reset to pending so _drain picks it up again.
        job.status = 'pending';
      } else {
        job.status = 'failed';
        log('failed', { jobId: job.id, to: job.to, error: message });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Default dispatcher (no-op / dev mode)
// ---------------------------------------------------------------------------

/**
 * Default dispatcher used when no real SMTP/API transport is configured.
 * Logs the job and resolves immediately — nothing is actually sent.
 * @param {EmailJob} job
 * @returns {Promise<void>}
 */
async function defaultDispatcher(job) {
  log('noop_send', {
    jobId: job.id,
    to: job.to,
    subject: job.subject,
    note: 'No dispatcher configured — set SMTP_* env vars or provide a custom dispatcher.',
  });
}

// ---------------------------------------------------------------------------
// Module-level singleton (shared across imports in one process)
// ---------------------------------------------------------------------------

/**
 * Shared queue instance.  Import this in the endpoint handler.
 *
 * To replace the dispatcher (e.g. wire up nodemailer / SendGrid), call:
 *   emailQueue._dispatcher = myRealSendFn;
 * before the first enqueue().
 */
export const emailQueue = new EmailQueue();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Minimal structured logger.
 * @param {string} event
 * @param {Record<string, unknown>} data
 */
function log(event, data = {}) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), module: 'email-queue', event, ...data }));
}
