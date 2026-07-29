# Booking engine (`api/_lib/`)

Domain logic for the Wander booking API. These are framework-free ES modules,
unit-tested with Vitest, and consumed by the Vercel serverless functions under
`api/`.

Module dependency graph (built incrementally by the orchestration epic):

```
availability.js          # deterministic demo inventory + nightly rates — no deps
  ├─ pricing.js          # imports availability — nights, subtotal, tax, total
  └─ validation.js       # imports availability — validates a quote request
        └─ booking.js     # imports pricing + validation — createQuote()
logging.js               # sanitized structured console events — no deps
```

`booking.js#createQuote()` is the domain entry point consumed by
`api/book.js`, the thin Vercel Function implementing `POST /api/book`. The
function only parses the request, emits one sanitized log event via
`logging.js`, and shapes the HTTP response; all business logic lives in the
tested modules here.

Each module ships its own `*.test.js` under `test/`. `npm test` (Vitest) and
`npm run lint` (ESLint) gate every change — a module that misuses a
dependency's API fails its tests, which fails the build gate.
