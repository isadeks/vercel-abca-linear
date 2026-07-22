# Contributing to Wander

Wander is a travel guide website plus a small booking API implemented as Vercel
serverless functions. This guide gets a new contributor from a fresh clone to a
green build.

## Prerequisites

- **Node.js 18 or newer** (the CI toolchain runs on a current LTS; Node 20+ is
  recommended). Check with `node --version`.
- **npm** (ships with Node). Used for installing dev dependencies and running
  the test/lint scripts.
- Optionally, the [Vercel CLI](https://vercel.com/docs/cli) (`npm i -g vercel`)
  if you want to run the serverless functions under `api/` locally.

## Getting started

Clone the repository and install the dev dependencies:

```bash
git clone https://github.com/isadeks/vercel-abca-linear.git
cd vercel-abca-linear
npm install
```

`npm install` pulls in the dev toolchain (ESLint + Vitest). There are no runtime
production dependencies — the site is static HTML and the API modules are
framework-free ES modules.

## Running the project locally

### The static site

The pages (`index.html`, `destinations.html`, the `*-guide.html` files, etc.)
are plain static HTML with inline CSS/JS and have no build step. Open a file
directly in your browser, or serve the directory with any static file server,
for example:

```bash
npx serve .
# or
python3 -m http.server 8000
```

Then visit the printed URL (e.g. http://localhost:8000).

### The booking API

The functions under `api/` are Vercel serverless functions backed by the domain
modules in `api/_lib/`. To run them locally as they'd run in production, use the
Vercel CLI from the repository root:

```bash
vercel dev
```

If you're only iterating on the booking domain logic, you usually don't need the
running server at all — the logic is unit-tested with Vitest (see below).

## Running the tests

Tests are written with [Vitest](https://vitest.dev/) and live under `test/`. Run
the full suite once with:

```bash
npm test
```

This runs `vitest run` (single, non-watch run). For an interactive
watch-and-rerun loop while developing, run Vitest directly:

```bash
npx vitest
```

## Running the linter

Linting uses [ESLint 9](https://eslint.org/) with a flat config
(`eslint.config.js`). Run it with:

```bash
npm run lint
```

This runs `eslint . --max-warnings=0`, so **any warning fails the check**. The
config intentionally scopes linting to `api/**/*.js` and `test/**/*.js`; the
static HTML files and their inline scripts predate this toolchain and are
ignored on purpose. Enforced rules include `no-unused-vars`, `prefer-const`, and
`eqeqeq`.

Both `npm test` and `npm run lint` are the build gate — please make sure both
pass before opening a pull request.

## Project layout

```
.
├── *.html                 # Static travel-guide site (no build step)
│                          #   index, destinations, about, contact, quiz,
│                          #   privacy, terms, and the *-guide.html pages
├── api/                   # Vercel serverless functions
│   └── _lib/              # Framework-free booking domain modules (ES modules)
│       └── README.md      # Booking-engine module map & dependency graph
├── test/                  # Vitest test files (*.test.js)
│   └── baseline.test.js   # Baseline test that keeps `npm test` green
├── docs/                  # Project documentation (this guide)
├── eslint.config.js       # Flat ESLint config (scopes lint to api/ + test/)
├── package.json           # Scripts (test, lint) and dev dependencies
└── package-lock.json      # Pinned dependency versions
```

### The booking engine (`api/_lib/`)

The booking domain logic is built as small, framework-free ES modules that are
unit-tested with Vitest and consumed by the serverless functions in `api/`. Each
module ships its own `*.test.js` under `test/`. See
[`api/_lib/README.md`](../api/_lib/README.md) for the module dependency graph.

## Coding conventions

- **ES modules everywhere.** `package.json` sets `"type": "module"`, so use
  `import`/`export` (not CommonJS `require`).
- **Keep the build gate green.** A change that breaks a dependency's contract
  should fail its tests — fix the code, don't loosen the tests.
- **Follow the lint rules.** Prefer `const`, use strict equality (`===`), and
  remove unused variables.

## Opening a pull request

1. Create a feature branch off `main`.
2. Make your change and add or update tests under `test/` as needed.
3. Run `npm test` and `npm run lint` — both must pass with no warnings.
4. Open a pull request describing the change and linking the relevant issue.
