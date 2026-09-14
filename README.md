# vercel-abca-linear

Wander travel guide site, with a booking API planned for the future.

Today the repository is the static travel guide site: `index.html`,
`destinations.html`, the per-destination `*-guide.html` pages, the
"Where should I go?" quiz, and the supporting `about`/`contact`/`privacy`/`terms`
pages. These are plain HTML with inline scripts and no bundler.

The booking API is **not implemented yet**. `api/` currently holds only a design
document, [`api/_lib/README.md`](api/_lib/README.md), describing the intended
module layout (availability, pricing, validation, booking) for future Vercel
serverless functions. None of those modules exist or are deployed.

## Development

There is no build step and `package.json` defines no `build` script — the HTML
pages are served as-is. Local setup is installing dependencies and running the
checks below manually.

Requirements: Node.js with npm. The toolchain is ESLint 9 and Vitest 2, and
`package.json` sets `"type": "module"`.

```bash
# Install dependencies exactly as pinned in package-lock.json
npm ci

# Lint (ESLint, warnings treated as errors)
npm run lint

# Run the test suite (Vitest, single run)
npm test
```

- `npm run lint` runs `eslint . --max-warnings=0` using the flat config in
  [`eslint.config.js`](eslint.config.js). Linting is scoped to `api/**/*.js` and
  `test/**/*.js`; the static HTML and its inline scripts predate this toolchain
  and are out of scope.
- `npm test` runs `vitest run` over the `*.test.js` files under `test/`. The
  suite is currently just a baseline placeholder.

There is no CI workflow in this repository, so these commands are not run
automatically on push or pull request. Please run them yourself before opening a
pull request.
