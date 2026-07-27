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

Each module ships its own `*.test.js` under `test/`. `npm test` (Vitest) and
`npm run lint` (ESLint) gate every change — a module that misuses a
dependency's API fails its tests, which fails the build gate.

---

## Auth layer (accounts + sessions)

`ABCA-886` adds a small, framework-free auth stack that the personalization
features build on. These modules live beside the booking helpers and follow the
same conventions (ES modules, Vitest tests, ESLint-clean):

```
crypto.js     # scrypt password hashing + token/email helpers — no deps
store.js      # pluggable async key/value persistence — no deps
  ├─ users.js         # createUser / authenticate — imports store + crypto
  ├─ sessions.js      # createSession / getSession — imports store + crypto
  └─ quiz-results.js  # saveQuizResult / listQuizResults — imports store + crypto
http.js       # cookie parsing, Set-Cookie building, JSON req/res — imports sessions
```

### Per-user personalization (quiz results)

`ABCA-888` is the first feature to persist *per-user* data on top of the auth
stack. `quiz-results.js` stores each completed "Where Should I Go?" result under
`quiz-results:<userId>` (an array, newest-first, capped at `MAX_RESULTS`), reusing
the same `getStore()` interface as accounts + sessions — so wiring KV once makes
quiz history durable too. The `/api/quiz-results` endpoint resolves the current
user from the session cookie (the same `getSession` + `findUserById` pattern as
`/api/current-session`) and requires a signed-in session for both GET and POST.

The quiz page (`quiz.html`) stays fully usable for anonymous visitors: the client
only calls the endpoint when a user is signed in, and a 401 is treated as a no-op
(the result is shown, just not saved). Shared result permalinks are never saved as
the viewer's own.

The Vercel serverless functions that expose these over HTTP live one level up:

| Endpoint                   | Method | Purpose                                      |
| -------------------------- | ------ | -------------------------------------------- |
| `/api/signup`              | POST   | Register (email + password) and sign in      |
| `/api/login`               | POST   | Sign in with email + password                |
| `/api/logout`              | POST   | Sign out (destroy session, clear cookie)     |
| `/api/current-session`     | GET    | Return the signed-in user, or `{user:null}`  |
| `/api/quiz-results`        | GET    | List the signed-in user's saved quiz results |
| `/api/quiz-results`        | POST   | Save a completed quiz result for the user     |

### Session model — how "stay signed in" works

`/api/signup` and `/api/login` create a random opaque session token and return
it in an **HttpOnly, SameSite=Lax** cookie (`wander_session`, `Secure` in
production, 30-day `Max-Age`). Because it is HttpOnly the token can't be read by
page JavaScript (mitigates XSS token theft); the browser sends it automatically
on later visits, so `/api/current-session` can resolve the current user without
a login prompt. `/api/logout` deletes the server-side session and expires the
cookie. Passwords are stored only as scrypt `salt:hash` values — never plaintext.

### Persistence approach (chosen + documented)

No datastore existed in the repo, and Vercel serverless functions run on an
**ephemeral filesystem** with no reliable shared memory between invocations, so
`store.js` is a tiny pluggable key/value layer that selects a backend at runtime:

- **Production → Vercel KV / Upstash Redis (recommended).** If the env vars
  `KV_REST_API_URL` + `KV_REST_API_TOKEN` are present, `store.js` talks to the
  Upstash REST API over `fetch` (no SDK dependency) for durable storage across
  invocations. Provision "KV" (Upstash) from the Vercel dashboard — the env vars
  are injected automatically; no code change needed.
- **Local dev / preview / tests → in-memory `Map` (zero-config fallback).** When
  those env vars are absent, data lives only in the warm instance. This keeps
  the site and `npm test` working out of the box; the tradeoff is that accounts
  are **not durable** until KV is configured. Later per-user personalization
  features reuse the same `getStore()` interface, so wiring KV once benefits
  everything.

Tests use `resetStore()` to get a clean in-memory backend per test.
