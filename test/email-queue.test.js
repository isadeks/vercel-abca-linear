import { describe, it, expect, vi } from 'vitest';
import { EmailQueue } from '../api/_lib/email-queue.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** @returns {import('../api/_lib/email-queue.js').EmailJob} */
function minimalJob() {
  return {
    to: 'guest@example.com',
    subject: 'Test email',
    html: '<p>Hello</p>',
    text: 'Hello',
  };
}

/** Returns a promise that resolves after all microtasks have drained. */
function flushMicrotasks() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// ---------------------------------------------------------------------------
// enqueue()
// ---------------------------------------------------------------------------

describe('EmailQueue.enqueue()', () => {
  it('returns a job object with status "pending"', () => {
    const q = new EmailQueue();
    const job = q.enqueue(minimalJob());
    expect(job.status).toBe('pending');
    expect(job.id).toBeTruthy();
    expect(job.to).toBe('guest@example.com');
  });

  it('assigns a unique id to each job', () => {
    const q = new EmailQueue();
    const ids = new Set([
      q.enqueue(minimalJob()).id,
      q.enqueue(minimalJob()).id,
      q.enqueue(minimalJob()).id,
    ]);
    expect(ids.size).toBe(3);
  });

  it('throws when "to" is missing', () => {
    const q = new EmailQueue();
    expect(() => q.enqueue({ subject: 'Hi', html: '', text: '' })).toThrow(
      /to.*required/i,
    );
  });

  it('throws when "subject" is missing', () => {
    const q = new EmailQueue();
    expect(() => q.enqueue({ to: 'a@b.com', html: '', text: '' })).toThrow(
      /subject.*required/i,
    );
  });
});

// ---------------------------------------------------------------------------
// list() and listByStatus()
// ---------------------------------------------------------------------------

describe('EmailQueue.list() / listByStatus()', () => {
  it('list() returns all jobs', () => {
    const q = new EmailQueue();
    q.enqueue(minimalJob());
    q.enqueue(minimalJob());
    expect(q.list().length).toBe(2);
  });

  it('returns copies not live references', () => {
    const q = new EmailQueue();
    q.enqueue(minimalJob());
    const [snapshot] = q.list();
    snapshot.status = 'sent'; // mutate the copy
    expect(q.list()[0].status).toBe('pending');
  });

  it('listByStatus() filters correctly', () => {
    const q = new EmailQueue();
    q.enqueue(minimalJob());
    q.enqueue(minimalJob());
    const pending = q.listByStatus('pending');
    expect(pending.length).toBe(2);
    const sent = q.listByStatus('sent');
    expect(sent.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// stats()
// ---------------------------------------------------------------------------

describe('EmailQueue.stats()', () => {
  it('counts jobs by status', () => {
    const q = new EmailQueue();
    q.enqueue(minimalJob());
    q.enqueue(minimalJob());
    const s = q.stats();
    expect(s.total).toBe(2);
    expect(s.pending).toBe(2);
    expect(s.sent).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// prune()
// ---------------------------------------------------------------------------

describe('EmailQueue.prune()', () => {
  it('removes sent and failed jobs', async () => {
    // Use a dispatcher that always succeeds, so jobs become "sent"
    const q = new EmailQueue({
      dispatcher: async () => {},
      concurrency: 5,
    });
    q.enqueue(minimalJob());
    q.enqueue(minimalJob());
    await flushMicrotasks();
    // Jobs should be sent by now
    const pruned = q.prune();
    expect(pruned).toBe(2);
    expect(q.list().length).toBe(0);
  });

  it('keeps pending and processing jobs', () => {
    // Use a dispatcher that never resolves, keeping jobs in processing
    const q = new EmailQueue({ dispatcher: () => new Promise(() => {}) });
    q.enqueue(minimalJob());
    // Don't await — job is processing
    const pruned = q.prune();
    expect(pruned).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Dispatcher — success path
// ---------------------------------------------------------------------------

describe('EmailQueue — dispatch success', () => {
  it('marks jobs as "sent" after a successful dispatch', async () => {
    const dispatcher = vi.fn().mockResolvedValue(undefined);
    const q = new EmailQueue({ dispatcher, concurrency: 2 });

    q.enqueue(minimalJob());
    await flushMicrotasks();

    expect(dispatcher).toHaveBeenCalledOnce();
    const jobs = q.list();
    expect(jobs[0].status).toBe('sent');
    expect(jobs[0].attempts).toBe(1);
  });

  it('calls dispatcher with job that contains to, subject, html, text', async () => {
    const dispatcher = vi.fn().mockResolvedValue(undefined);
    const q = new EmailQueue({ dispatcher });

    q.enqueue({ to: 'x@y.com', subject: 'Hi', html: '<b>Hi</b>', text: 'Hi' });
    await flushMicrotasks();

    const receivedJob = dispatcher.mock.calls[0][0];
    expect(receivedJob.to).toBe('x@y.com');
    expect(receivedJob.subject).toBe('Hi');
    expect(receivedJob.html).toBe('<b>Hi</b>');
    expect(receivedJob.text).toBe('Hi');
  });
});

// ---------------------------------------------------------------------------
// Dispatcher — retry / failure path
// ---------------------------------------------------------------------------

describe('EmailQueue — dispatch retry and failure', () => {
  it('retries up to maxAttempts before marking failed', async () => {
    const dispatcher = vi.fn().mockRejectedValue(new Error('SMTP error'));
    const q = new EmailQueue({ dispatcher, maxAttempts: 3, concurrency: 1 });

    q.enqueue(minimalJob());

    // Let all retry micro-tasks run
    for (let i = 0; i < 10; i++) {
      await flushMicrotasks();
    }

    expect(dispatcher).toHaveBeenCalledTimes(3);
    const [job] = q.list();
    expect(job.status).toBe('failed');
    expect(job.attempts).toBe(3);
    expect(job.error).toContain('SMTP error');
  });

  it('stores the last error on the job', async () => {
    const dispatcher = vi.fn().mockRejectedValue(new Error('Timeout'));
    const q = new EmailQueue({ dispatcher, maxAttempts: 1 });

    q.enqueue(minimalJob());
    await flushMicrotasks();

    const [job] = q.list();
    expect(job.error).toContain('Timeout');
  });

  it('recovers on a later attempt when first fails', async () => {
    let calls = 0;
    const dispatcher = vi.fn().mockImplementation(async () => {
      calls += 1;
      if (calls < 2) throw new Error('temporary failure');
    });
    const q = new EmailQueue({ dispatcher, maxAttempts: 3, concurrency: 1 });

    q.enqueue(minimalJob());

    for (let i = 0; i < 10; i++) {
      await flushMicrotasks();
    }

    const [job] = q.list();
    expect(job.status).toBe('sent');
    expect(job.attempts).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Concurrency
// ---------------------------------------------------------------------------

describe('EmailQueue — concurrency', () => {
  it('does not exceed concurrency limit', async () => {
    let active = 0;
    let maxSeen = 0;
    const dispatcher = vi.fn().mockImplementation(async () => {
      active += 1;
      maxSeen = Math.max(maxSeen, active);
      await new Promise((r) => setTimeout(r, 5));
      active -= 1;
    });

    const q = new EmailQueue({ dispatcher, concurrency: 2 });
    q.enqueue(minimalJob());
    q.enqueue(minimalJob());
    q.enqueue(minimalJob());
    q.enqueue(minimalJob());

    await new Promise((r) => setTimeout(r, 50));

    expect(maxSeen).toBeLessThanOrEqual(2);
  });
});
