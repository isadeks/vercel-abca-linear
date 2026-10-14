import { describe, it, expect } from 'vitest';
import { processPayment } from '../api/_lib/payment.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A fully-valid payment request that should always produce ok: true. */
function validRequest(overrides = {}) {
  return {
    confirmationId: 'wander-malibu-2026-08-01-2026-08-04-r2-g4',
    amountUsd: 3024,
    card: {
      number: '4111111111111111', // Luhn-valid Visa test number
      expiry: '12/30',
      cvv: '123',
      holderName: 'Ada Lovelace',
    },
    ...overrides,
  };
}

/** Override a nested card field without clobbering the full card object. */
function cardOverride(cardFields) {
  return { card: { ...validRequest().card, ...cardFields } };
}

// ---------------------------------------------------------------------------
// Valid request — ok: true, status: 'captured'
// ---------------------------------------------------------------------------

describe('processPayment — valid request', () => {
  it('returns ok: true and status: captured for a valid request', () => {
    const result = processPayment(validRequest());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.status).toBe('captured');
    }
  });

  it('echoes back confirmationId and amountUsd', () => {
    const req = validRequest();
    const result = processPayment(req);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.confirmationId).toBe(req.confirmationId);
      expect(result.amountUsd).toBe(req.amountUsd);
    }
  });

  it('includes a transactionId string', () => {
    const result = processPayment(validRequest());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(typeof result.transactionId).toBe('string');
      expect(result.transactionId.length).toBeGreaterThan(0);
    }
  });

  it('derives a deterministic transactionId from confirmationId + amountUsd', () => {
    const req = validRequest();
    const r1 = processPayment(req);
    const r2 = processPayment(req);
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    if (r1.ok && r2.ok) {
      expect(r1.transactionId).toBe(r2.transactionId);
    }
  });

  it('accepts an optional txnId override', () => {
    const result = processPayment(validRequest(), 'CUSTOM-TXN-999');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.transactionId).toBe('CUSTOM-TXN-999');
    }
  });

  it('accepts a card number with spaces', () => {
    const result = processPayment(validRequest(cardOverride({ number: '4111 1111 1111 1111' })));
    expect(result.ok).toBe(true);
  });

  it('accepts a 4-digit CVV', () => {
    const result = processPayment(validRequest(cardOverride({ cvv: '1234' })));
    expect(result.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Gateway decline — known decline card
// ---------------------------------------------------------------------------

describe('processPayment — gateway decline', () => {
  it('returns ok: false and declined: true for the decline test card', () => {
    const result = processPayment(validRequest(cardOverride({ number: '4000000000000002' })));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.declined).toBe(true);
      expect(result.errors).toContain('card declined by gateway');
    }
  });
});

// ---------------------------------------------------------------------------
// Validation — confirmationId
// ---------------------------------------------------------------------------

describe('processPayment — confirmationId validation', () => {
  it('fails when confirmationId is missing', () => {
    const req = validRequest();
    delete req.confirmationId;
    const result = processPayment(req);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /confirmationId/.test(e))).toBe(true);
    }
  });

  it('fails when confirmationId is an empty string', () => {
    const result = processPayment(validRequest({ confirmationId: '   ' }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /confirmationId/.test(e))).toBe(true);
    }
  });

  it('fails when confirmationId is a number', () => {
    const result = processPayment(validRequest({ confirmationId: 12345 }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /confirmationId/.test(e))).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Validation — amountUsd
// ---------------------------------------------------------------------------

describe('processPayment — amountUsd validation', () => {
  it('fails when amountUsd is zero', () => {
    const result = processPayment(validRequest({ amountUsd: 0 }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /amountUsd/.test(e))).toBe(true);
    }
  });

  it('fails when amountUsd is negative', () => {
    const result = processPayment(validRequest({ amountUsd: -50 }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /amountUsd/.test(e))).toBe(true);
    }
  });

  it('fails when amountUsd is a string', () => {
    const result = processPayment(validRequest({ amountUsd: '3024' }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /amountUsd/.test(e))).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Validation — card.number
// ---------------------------------------------------------------------------

describe('processPayment — card.number validation', () => {
  it('fails when card.number fails the Luhn check', () => {
    const result = processPayment(validRequest(cardOverride({ number: '4111111111111112' })));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /Luhn/.test(e))).toBe(true);
    }
  });

  it('fails when card.number is too short', () => {
    const result = processPayment(validRequest(cardOverride({ number: '1234' })));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /card\.number/.test(e))).toBe(true);
    }
  });

  it('fails when card.number contains letters', () => {
    const result = processPayment(validRequest(cardOverride({ number: '411111111111111X' })));
    expect(result.ok).toBe(false);
  });

  it('fails when card.number is missing', () => {
    const req = validRequest();
    delete req.card.number;
    const result = processPayment(req);
    expect(result.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Validation — card.expiry
// ---------------------------------------------------------------------------

describe('processPayment — card.expiry validation', () => {
  it('fails when card.expiry is in the past', () => {
    const result = processPayment(validRequest(cardOverride({ expiry: '01/20' })));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /expiry/.test(e))).toBe(true);
    }
  });

  it('fails when card.expiry has wrong format', () => {
    const result = processPayment(validRequest(cardOverride({ expiry: '2030-12' })));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /expiry/.test(e))).toBe(true);
    }
  });

  it('fails when month is out of range', () => {
    const result = processPayment(validRequest(cardOverride({ expiry: '13/30' })));
    expect(result.ok).toBe(false);
  });

  it('fails when card.expiry is missing', () => {
    const req = validRequest();
    delete req.card.expiry;
    const result = processPayment(req);
    expect(result.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Validation — card.cvv
// ---------------------------------------------------------------------------

describe('processPayment — card.cvv validation', () => {
  it('fails when cvv is 2 digits', () => {
    const result = processPayment(validRequest(cardOverride({ cvv: '12' })));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /cvv/.test(e))).toBe(true);
    }
  });

  it('fails when cvv is 5 digits', () => {
    const result = processPayment(validRequest(cardOverride({ cvv: '12345' })));
    expect(result.ok).toBe(false);
  });

  it('fails when cvv contains letters', () => {
    const result = processPayment(validRequest(cardOverride({ cvv: '12X' })));
    expect(result.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Validation — card.holderName
// ---------------------------------------------------------------------------

describe('processPayment — card.holderName validation', () => {
  it('fails when holderName is empty', () => {
    const result = processPayment(validRequest(cardOverride({ holderName: '' })));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /holderName/.test(e))).toBe(true);
    }
  });

  it('fails when holderName is whitespace only', () => {
    const result = processPayment(validRequest(cardOverride({ holderName: '   ' })));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /holderName/.test(e))).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Validation — card field is not an object
// ---------------------------------------------------------------------------

describe('processPayment — card field structure', () => {
  it('fails when card is null', () => {
    const result = processPayment(validRequest({ card: null }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /card/.test(e))).toBe(true);
    }
  });

  it('fails when card is a string', () => {
    const result = processPayment(validRequest({ card: '4111111111111111' }));
    expect(result.ok).toBe(false);
  });

  it('fails when card is missing entirely', () => {
    const req = validRequest();
    delete req.card;
    const result = processPayment(req);
    expect(result.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Multiple errors accumulate
// ---------------------------------------------------------------------------

describe('processPayment — multiple errors', () => {
  it('accumulates multiple errors without short-circuiting', () => {
    const result = processPayment({
      confirmationId: '',
      amountUsd: -1,
      card: {
        number: '1234',
        expiry: '00/00',
        cvv: '1',
        holderName: '',
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.length).toBeGreaterThan(1);
    }
  });
});
