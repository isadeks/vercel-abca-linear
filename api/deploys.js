/**
 * GET /api/deploys
 *
 * Returns the most-recent Vercel deployments for this project.
 *
 * Requires the following environment variables (set in the Vercel dashboard):
 *   VERCEL_TOKEN      – personal access token with project read scope
 *   VERCEL_TEAM_ID    – (optional) team slug / id prefix; omit for personal accounts
 *   VERCEL_PROJECT_ID – project id or name slug
 *
 * When the variables are absent (local dev, no token set) the handler returns a
 * small set of stub entries so the status page renders without crashing.
 */

const VERCEL_API = 'https://api.vercel.com';
const MAX_DEPLOYS = 10;

/** Map Vercel's raw state to a normalised display state. */
function normState(raw) {
  if (raw === 'READY') return 'success';
  if (raw === 'ERROR' || raw === 'CANCELED') return 'failed';
  if (raw === 'BUILDING' || raw === 'INITIALIZING') return 'building';
  return 'unknown';
}

function stubDeploys() {
  const now = Date.now();
  return [
    { id: 'stub-1', url: '#', state: 'success', createdAt: new Date(now - 3_600_000).toISOString(), branch: 'main', commit: 'abc1234', commitMessage: 'chore: stub deploy (no Vercel token)' },
    { id: 'stub-2', url: '#', state: 'success', createdAt: new Date(now - 86_400_000).toISOString(), branch: 'main', commit: 'def5678', commitMessage: 'feat: initial status page' },
  ];
}

export default async function handler(_req, res) {
  const token     = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId    = process.env.VERCEL_TEAM_ID;

  if (!token || !projectId) {
    return res.status(200).json({ stub: true, deploys: stubDeploys() });
  }

  const qs = new URLSearchParams({ limit: String(MAX_DEPLOYS) });
  if (teamId) qs.set('teamId', teamId);
  // projectId can be a name slug or raw id
  const url = `${VERCEL_API}/v6/deployments?${qs}&projectId=${encodeURIComponent(projectId)}`;

  let raw;
  try {
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) {
      const text = await resp.text();
      return res.status(502).json({ error: 'Vercel API error', status: resp.status, detail: text });
    }
    raw = await resp.json();
  } catch (err) {
    return res.status(502).json({ error: 'fetch failed', detail: String(err) });
  }

  const deploys = (raw.deployments ?? []).map((d) => ({
    id:            d.uid,
    url:           d.url ? `https://${d.url}` : '#',
    state:         normState(d.state ?? d.readyState),
    createdAt:     new Date(d.createdAt).toISOString(),
    branch:        d.meta?.githubCommitRef ?? d.branch ?? '',
    commit:        (d.meta?.githubCommitSha ?? '').slice(0, 7),
    commitMessage: d.meta?.githubCommitMessage ?? '',
  }));

  return res.status(200).json({ stub: false, deploys });
}
