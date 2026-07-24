// Unit tests for the per-user quiz-results domain module.
import { describe, it, expect, beforeEach } from 'vitest';
import { resetStore } from '../api/_lib/store.js';
import {
  saveQuizResult,
  listQuizResults,
  normalizeResult,
  MAX_RESULTS,
} from '../api/_lib/quiz-results.js';

const validInput = {
  destinationId: 'amalfi',
  destinationName: 'Amalfi Coast',
  destinationRegion: 'Southern Europe',
  destinationCountry: 'Italy',
  score: 42,
  answers: [0, 1, 2, 0, 1, 1, 2, 0],
};

describe('quiz-results module', () => {
  beforeEach(() => {
    resetStore();
  });

  it('lists an empty array for a user with no saved results', async () => {
    expect(await listQuizResults('user-1')).toEqual([]);
  });

  it('lists an empty array when no userId is given', async () => {
    expect(await listQuizResults(null)).toEqual([]);
  });

  it('saves a result and reads it back with an id + timestamp', async () => {
    const record = await saveQuizResult('user-1', validInput);
    expect(record.id).toBeTruthy();
    expect(record.destinationId).toBe('amalfi');
    expect(record.destinationName).toBe('Amalfi Coast');
    expect(record.score).toBe(42);
    expect(record.answers).toEqual([0, 1, 2, 0, 1, 1, 2, 0]);
    expect(new Date(record.createdAt).getTime()).not.toBeNaN();

    const list = await listQuizResults('user-1');
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(record.id);
  });

  it('keeps results newest-first', async () => {
    await saveQuizResult('user-1', { ...validInput, destinationId: 'kyoto' });
    await saveQuizResult('user-1', { ...validInput, destinationId: 'norway' });
    const list = await listQuizResults('user-1');
    expect(list.map((r) => r.destinationId)).toEqual(['norway', 'kyoto']);
  });

  it('scopes results per user', async () => {
    await saveQuizResult('user-1', { ...validInput, destinationId: 'amalfi' });
    await saveQuizResult('user-2', { ...validInput, destinationId: 'patagonia' });
    expect((await listQuizResults('user-1')).map((r) => r.destinationId)).toEqual(['amalfi']);
    expect((await listQuizResults('user-2')).map((r) => r.destinationId)).toEqual(['patagonia']);
  });

  it('caps history at MAX_RESULTS, dropping the oldest', async () => {
    for (let i = 0; i < MAX_RESULTS + 5; i++) {
      await saveQuizResult('user-1', { ...validInput, score: i });
    }
    const list = await listQuizResults('user-1');
    expect(list).toHaveLength(MAX_RESULTS);
    // Newest first: last saved score is MAX_RESULTS + 4.
    expect(list[0].score).toBe(MAX_RESULTS + 4);
    // Oldest retained is score 5 (0..4 dropped).
    expect(list[list.length - 1].score).toBe(5);
  });

  it('requires a userId to save', async () => {
    await expect(saveQuizResult('', validInput)).rejects.toMatchObject({
      code: 'INVALID_RESULT',
    });
  });

  it('coerces a numeric-string score to a number', async () => {
    const record = await saveQuizResult('user-1', { ...validInput, score: '17' });
    expect(record.score).toBe(17);
  });

  it('defaults destinationName to destinationId when missing', async () => {
    const record = await saveQuizResult('user-1', { destinationId: 'santorini', score: 3 });
    expect(record.destinationName).toBe('santorini');
    expect(record.answers).toEqual([]);
  });
});

describe('normalizeResult validation', () => {
  it('rejects a non-object payload', () => {
    expect(() => normalizeResult(null)).toThrow(/required/);
    expect(() => normalizeResult('nope')).toThrow(/required/);
  });

  it('rejects a missing destinationId', () => {
    expect(() => normalizeResult({ score: 1 })).toThrow(/destinationId/);
  });

  it('rejects a non-numeric score', () => {
    expect(() => normalizeResult({ destinationId: 'x', score: 'abc' })).toThrow(/score/);
  });

  it('rejects a non-array answers field', () => {
    expect(() => normalizeResult({ destinationId: 'x', score: 1, answers: 'nope' })).toThrow(
      /answers must be an array/,
    );
  });

  it('rejects non-numeric answers', () => {
    expect(() =>
      normalizeResult({ destinationId: 'x', score: 1, answers: [0, 'b'] }),
    ).toThrow(/answers must contain only numbers/);
  });

  it('trims string fields', () => {
    const out = normalizeResult({
      destinationId: '  amalfi  ',
      destinationName: '  Amalfi  ',
      score: 1,
    });
    expect(out.destinationId).toBe('amalfi');
    expect(out.destinationName).toBe('Amalfi');
  });
});
