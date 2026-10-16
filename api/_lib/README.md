# Booking engine (`api/_lib/`)

Domain logic for the Wander booking API. These are framework-free ES modules,
unit-tested with Vitest, and consumed by the serverless functions under `api/`
(deployed on AWS Amplify).

Module dependency graph (built incrementally by the orchestration epic):

```
availability.js          # room/date availability — no deps
  ├─ pricing.js          # imports availability — nightly rates, taxes, totals
  └─ validation.js       # imports availability — validates a booking request
        └─ booking.js     # imports pricing + validation — createBooking()
```

Each module ships its own `*.test.js` under `test/`. `npm test` (Vitest) and
`npm run lint` (ESLint) gate every change — a module that misuses a
dependency's API fails its tests, which fails the build gate.
