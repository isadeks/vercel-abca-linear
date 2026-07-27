// Pluggable key/value persistence for the auth layer.
//
// Vercel serverless functions run on an ephemeral, read-only-ish filesystem and
// do not share memory reliably between invocations, so there is no built-in
// place to durably store users + sessions. Rather than hard-wire a specific
// datastore, this module exposes a tiny async key/value interface and picks a
// backend at runtime:
//
//   • If Vercel KV / Upstash Redis REST env vars are present
//     (KV_REST_API_URL + KV_REST_API_TOKEN), it uses the Upstash REST API over
//     `fetch` — no SDK dependency, durable across invocations. This is the
//     recommended production backend (provision "Vercel KV" / Upstash from the
//     Vercel dashboard; the env vars are injected automatically).
//   • Otherwise it falls back to an in-process Map. This keeps local dev, unit
//     tests, and preview deploys working with zero configuration. The tradeoff:
//     data lives only as long as the warm serverless instance, so accounts are
//     not durable without KV configured. This is documented in the API README.
//
// The interface is intentionally minimal (get/set/del) so later personalization
// features can reuse the same store for per-user data.

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

// ── In-memory backend (default / tests / local dev) ─────────────────────────
function createMemoryStore() {
  const map = new Map();
  return {
    name: 'memory',
    async get(key) {
      return map.has(key) ? map.get(key) : null;
    },
    async set(key, value) {
      map.set(key, value);
    },
    async del(key) {
      map.delete(key);
    },
    // Test/support helper — not part of the durable contract.
    _clear() {
      map.clear();
    },
  };
}

// ── Upstash Redis REST backend (production) ─────────────────────────────────
function createKvStore(url, token) {
  async function command(parts) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(parts),
    });
    if (!res.ok) {
      throw new Error(`KV request failed: ${res.status}`);
    }
    const data = await res.json();
    return data.result;
  }
  return {
    name: 'kv',
    async get(key) {
      const raw = await command(['GET', key]);
      return raw === null || raw === undefined ? null : JSON.parse(raw);
    },
    async set(key, value) {
      await command(['SET', key, JSON.stringify(value)]);
    },
    async del(key) {
      await command(['DEL', key]);
    },
  };
}

// Singleton store for the lifetime of the module (and thus the warm instance).
let store;
export function getStore() {
  if (!store) {
    store = KV_URL && KV_TOKEN ? createKvStore(KV_URL, KV_TOKEN) : createMemoryStore();
  }
  return store;
}

// Allow tests to inject a fresh/custom backend.
export function setStore(custom) {
  store = custom;
}

// Convenience for tests: reset to a clean in-memory store.
export function resetStore() {
  store = createMemoryStore();
  return store;
}
