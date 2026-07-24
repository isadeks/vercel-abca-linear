# vercel-abca-linear

Wander — a static travel-guide site plus Vercel serverless functions under
`api/` (booking API + user accounts).

## Accounts & sign-in (`ABCA-886`)

Visitors can register with an email + password, sign in, stay signed in across
visits, and sign out. The **Account** screen lives at `account.html` and the
site nav shows a **Sign in** / **Account** indicator.

- **Endpoints:** `POST /api/signup`, `POST /api/login`, `POST /api/logout`,
  `GET /api/current-session`.
- **Shared helpers:** `api/_lib/` (`crypto`, `store`, `users`, `sessions`,
  `http`) — reusable by later personalization features.
- **Sessions:** an HttpOnly, SameSite=Lax cookie (`wander_session`) carries an
  opaque token; passwords are stored only as scrypt hashes.
- **Persistence:** a pluggable key/value store — uses **Vercel KV / Upstash
  Redis** when `KV_REST_API_URL` + `KV_REST_API_TOKEN` are set, and falls back
  to an in-memory store for local dev, previews, and tests. See
  [`api/_lib/README.md`](api/_lib/README.md) for the full rationale.

## Development

```bash
npm test        # Vitest unit + endpoint tests
npm run lint    # ESLint (flat config, scoped to api/ + test/)
```
