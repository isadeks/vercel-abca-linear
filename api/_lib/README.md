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

## Dependency graph constraints

The module graph above is a **DAG (directed acyclic graph)**. Cyclic
dependencies (e.g. A → B → A) are invalid and must never appear in this
codebase. If a proposed change would introduce a cycle the orchestrator should
reject the task graph before any work begins.

## Stress test: STRESS-5 cycle rejection (ABCA-342)

ABCA-342 is a stress test that creates an intentional dependency cycle
(Node A → Node B → Node A) to verify that the orchestrator rejects invalid
task graphs before dispatch. The child tasks ABCA-343 and ABCA-344 carry the
description "This must never execute" — if an agent receives either of these
tasks, it is evidence that the orchestrator dispatched work it should have
rejected. No code changes should be made for those issues.
