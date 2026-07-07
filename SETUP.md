# AWS Amplify Deployment Setup

This guide covers the manual AWS Console steps you need to complete before the site goes live. The repository already contains an `amplify.yml` build configuration — you just need to wire it up in the AWS Console.

> **Time estimate:** ~10 minutes.

---

## Prerequisites

- An AWS account. If you don't have one, create one at <https://aws.amazon.com/>.
- Owner or collaborator access to the GitHub repository `isadeks/vercel-abca-linear`.

---

## Step 1 — Sign in to the AWS Console

1. Go to <https://console.aws.amazon.com/>.
2. Sign in with your AWS credentials.
3. In the top-right region selector, choose the AWS region closest to your audience (e.g. **us-east-1** for North America, **eu-west-1** for Europe).

---

## Step 2 — Open AWS Amplify

1. In the search bar at the top of the Console, type **Amplify** and select **AWS Amplify** from the results.
2. Click **Create new app** (or **New app → Host web app** if you see the older UI).

---

## Step 3 — Connect the GitHub repository

1. On the *Deploy your app* screen, select **GitHub** as the source provider.
2. Click **Authorize AWS Amplify** if this is the first time — you will be redirected to GitHub to grant read access to your repositories.
3. After authorisation returns you to the Console, use the **Repository** dropdown to select **isadeks/vercel-abca-linear**.

---

## Step 4 — Select the deployment branch

1. In the **Branch** dropdown, choose the branch you want to deploy to production.
   - For a stable release, choose `main` (or whichever branch you treat as the production branch).
   - Amplify will redeploy automatically every time a new commit is pushed to this branch.
2. Leave **Monorepo root directory** blank (the `amplify.yml` is in the repository root).
3. Click **Next**.

---

## Step 5 — Review the build settings

Amplify will detect the `amplify.yml` file in the repository root and pre-populate the build settings automatically. Verify that the detected configuration matches the following:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci --no-audit --no-fund
    build:
      commands:
        - npm run lint
        - npm test
  artifacts:
    baseDirectory: .
    files:
      - "*.html"
  cache:
    paths:
      - node_modules/**/*
```

No manual edits are needed — just confirm it looks correct, then click **Next**.

---

## Step 6 — Deploy

1. On the *Review* screen, confirm the repository, branch, and build settings.
2. Click **Save and deploy**.
3. Amplify will start the first deployment. You can watch the progress in real time on the pipeline view — it goes through four stages: **Provision → Build → Deploy → Verify**.

A successful deployment takes roughly 2–4 minutes. When the **Verify** stage shows a green tick, the site is live.

---

## Step 7 — Confirm the site is working

1. On the app's overview page, click the auto-generated URL (e.g. `https://main.d1xxxxxxxxxx.amplifyapp.com`).
2. You should see the Wander travel guide home page.
3. Optionally, set up a custom domain under **App settings → Domain management** if you have your own domain.

---

## Automatic redeployments

From this point on, every push to the connected branch triggers a new build and deployment automatically — no further console action is needed.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Build fails at `npm run lint` | A linting error was introduced | Check the build logs for the ESLint message; fix the offending file and push again |
| Build fails at `npm test` | A test is failing | Run `npm test` locally to reproduce; fix and push |
| "No artifacts found" error | `amplify.yml` `baseDirectory` or `files` pattern is wrong | Verify the `amplify.yml` content matches the example in Step 5 |
| GitHub authorisation not appearing | Pop-up was blocked | Allow pop-ups for `console.aws.amazon.com` and retry Step 3 |
