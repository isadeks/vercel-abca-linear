# vercel-abca-linear

Demo repository for the **Wander** travel-guide site + booking API, used as a
testbed for an autonomous coding-agent harness.

## The agent harness

This repo is driven by an automated **background coding agent** harness that
turns issues into pull requests without a human in the loop. A task starts as a
[Linear](https://linear.app) issue; the harness pre-fetches the issue's title,
description, comments, and attachments, then launches a Claude agent inside an
isolated container with a fresh checkout of the repository on a dedicated
`bgagent/…` branch. The agent reads the codebase, makes the requested change,
runs the project's build, lint, and test gates (`npm run lint`, `npm test`),
commits its work, and opens a GitHub pull request describing what it did and how
it validated the change. Throughout the run the harness manages all Linear
interaction on the agent's behalf — reacting to the issue, moving it through its
workflow states, and posting the final result with links and metrics — while
Vercel handles deployment of the site and its serverless functions. The agent
works fully unattended, making and documenting its own decisions, so each Linear
issue flows automatically from request to reviewable PR.
