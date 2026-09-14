# vercel-abca-linear

Wander travel guide site + booking API (Vercel serverless functions).

The repository contains the static travel guide pages (`index.html`,
`destinations.html`, the per-destination `*-guide.html` pages, and the
"Where should I go?" quiz) alongside the booking API under `api/`, which is
deployed as Vercel serverless functions. Booking domain logic lives in
`api/_lib/` as framework-free ES modules — see
[`api/_lib/README.md`](api/_lib/README.md) for the module layout.

## Development

There is no build step: the HTML pages are served as-is and the functions under
`api/` are built by Vercel on deploy. Local development is limited to
installing dependencies and running the checks below.

Requirements: Node.js with npm. The toolchain targets ESLint 9 and Vitest 2,
and `package.json` sets `"type": "module"`.

```bash
# Install dependencies exactly as pinned in package-lock.json
npm ci

# Lint the booking API and tests (ESLint, warnings treated as errors)
npm run lint

# Run the unit test suite (Vitest, single run)
npm test
```

Notes on the two checks:

- `npm run lint` runs `eslint . --max-warnings=0` using the flat config in
  [`eslint.config.js`](eslint.config.js). Linting is deliberately scoped to
  `api/**/*.js` and `test/**/*.js`; the static HTML and its inline scripts
  predate this toolchain and are out of scope.
- `npm test` runs `vitest run`, which executes the `*.test.js` files under
  `test/`.

Both commands gate every change, so run them before opening a pull request.
