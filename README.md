# vercel-abca-linear

## Analytics

This site uses a lightweight, privacy-first analytics approach. No JavaScript tracking library is required — analytics data is collected passively via server-side logs and optional third-party integrations.

### What is tracked

- **Page views** — each HTML page (`index.html`, `destinations.html`, guide pages, etc.) records a view on every request.
- **Referrers** — the HTTP `Referer` header identifies traffic sources (search engines, social media, direct links).
- **Geographic region** — derived from request IP addresses at the CDN/edge layer; individual IPs are never stored.
- **Device type** — inferred from the `User-Agent` header (desktop, tablet, mobile).

### How it works

Vercel's built-in analytics captures request-level telemetry automatically for all static deployments. No additional SDK, script tag, or client-side code is needed. Data is visible in the Vercel dashboard under **Analytics → Web Analytics**.

For richer event tracking (e.g. quiz completions, destination clicks), a no-JS fallback is available: embed a 1×1 transparent `<img>` whose `src` points to a logging endpoint. The endpoint records the event server-side without requiring JavaScript to be enabled on the client.

### Privacy

- No cookies are set for analytics purposes.
- No personal data is stored; IP addresses are anonymised before logging.
- All data collection complies with the site's [Privacy Policy](privacy.html).

### Extending analytics

To add a new tracked event:

1. Identify the page and user action to track.
2. Add an `<img>` beacon or use Vercel's Edge Middleware to emit a server-side log entry.
3. Document the new event name and expected payload in this section.