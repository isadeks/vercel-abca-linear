# vercel-abca-linear

Wander travel guide site + booking API (Vercel serverless functions).

## API

### `GET /health`

Returns the service health status and the deployed app version as JSON:

```json
{ "status": "ok", "version": "1.0.0" }
```

Responds with `200 OK`. Non-`GET` methods return `405 Method Not Allowed`.

Example:

```bash
curl https://<your-deployment>/health
# {"status":"ok","version":"1.0.0"}
```

You can also run the equivalent check locally from the CLI:

```bash
npm run health
# health check OK: {"status":"ok","version":"1.0.0"}
```

The CLI exits `0` when healthy and `1` otherwise, so it can be used as a deploy
smoke check.

## Running the tests

The booking API and its endpoints are unit-tested with [Vitest](https://vitest.dev/)
and linted with [ESLint](https://eslint.org/):

```bash
npm install   # first time only
npm test      # run the Vitest suite
npm run lint  # run ESLint
```
