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

auth.js                  # authentication — no deps (node:crypto only)
```

## `auth.js`

Framework-free authentication primitives for the booking API:

- `hashPassword(password)` / `verifyPassword(password, stored)` — scrypt with a
  per-hash random salt, encoded as `scrypt$<salt>$<hash>`. Verification is
  constant-time and returns `false` (never throws) on malformed stored values.
- `createToken(payload, secret, opts?)` / `verifyToken(token, secret, opts?)` —
  stateless HMAC-SHA256 signed session tokens carrying `iat`/`exp`. Stateless
  tokens suit the serverless model (no shared session store between
  invocations). `verifyToken` throws on bad signature / expiry / malformed input.
- `authenticateRequest(authorizationHeader, secret, opts?)` — pulls a `Bearer`
  token from an `Authorization` header and verifies it, returning claims or
  `null`.

`opts.now` (ms) and `opts.ttlSeconds` make token expiry deterministic in tests.

Each module ships its own `*.test.js` under `test/`. `npm test` (Vitest) and
`npm run lint` (ESLint) gate every change — a module that misuses a
dependency's API fails its tests, which fails the build gate.
