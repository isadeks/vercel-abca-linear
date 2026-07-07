# Booking engine (`api/_lib/`)

Domain logic for the Wander booking API. These are framework-free ES modules,
unit-tested with Vitest, and consumed by the Vercel serverless functions under
`api/`.

Module dependency graph (built incrementally by the orchestration epic):

```
availability.js          # room/date availability — no deps
  ├─ pricing.js          # imports availability — nightly rates, taxes, totals
  └─ validation.js       # imports availability — validates a booking request
        └─ booking.js     # imports pricing + validation — createBooking()
```

Each module ships its own `*.test.js` under `test/`. Both `npm test` (Vitest) and
`npm run lint` (ESLint) gate every change — a module that misuses a
dependency's API will fail its tests and fail the build gate.

## Comment-style conventions

All exported functions must have a JSDoc block. Inline comments are welcome for
non-obvious logic. Follow these rules consistently so the docs read well across
every module.

### JSDoc tags

Use the following tags for every exported function, in this order:

| Tag | Purpose |
|-----|---------|
| `@param {Type} name` | Each parameter, one line per param |
| `@returns {Type}` | The return value (omit for `void`) |
| `@throws {ErrorType}` | Each error the function may throw |

Only add `@example` when a usage pattern is genuinely unclear from the
signature alone.

### Tense and voice

- Write descriptions in the **present tense, third-person singular** — the
  function *does* something, it does not *do* something.
  - ✅ `Calculates the total nightly rate, including taxes.`
  - ❌ `Calculate the total nightly rate, including taxes.`
- Use **active voice**. Avoid constructions like "is used to" or "can be
  called to".
- Omit filler phrases such as "This function …" or "A helper that …" — start
  directly with the verb.

### Example

```js
/**
 * Calculates the total nightly rate for a booking, including all applicable
 * taxes and service fees.
 *
 * @param {string} roomId - Unique identifier of the room.
 * @param {Date} checkIn - Start of the stay (midnight local time).
 * @param {Date} checkOut - End of the stay (midnight local time).
 * @returns {number} Total cost in the property's base currency.
 * @throws {RangeError} If checkOut is not after checkIn.
 */
export function calculateTotalRate(roomId, checkIn, checkOut) { … }
```
