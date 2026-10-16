/**
 * Vercel serverless function: GET /changelog.xml
 * Returns an RSS 2.0 feed of the Wander changelog.
 */
import { changelog } from '../data/changelog.js';

const SITE_URL = 'https://wander-travel.vercel.app';
const FEED_TITLE = 'Wander Changelog';
const FEED_DESCRIPTION = 'Product updates and new content from Wander travel guides.';

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildRss(entries) {
  const items = entries
    .map((entry) => {
      const pubDate = new Date(entry.date).toUTCString();
      const link = `${SITE_URL}/changelog.html#v${escapeXml(entry.version)}`;
      return `    <item>
      <title>${escapeXml(`[${entry.category}] ${entry.title}`)}</title>
      <link>${link}</link>
      <guid isPermaLink="false">${SITE_URL}/changelog#v${escapeXml(entry.version)}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(entry.body)}</description>
    </item>`;
    })
    .join('\n');

  const lastBuildDate = entries.length > 0 ? new Date(entries[0].date).toUTCString() : new Date().toUTCString();

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(FEED_TITLE)}</title>
    <link>${SITE_URL}/changelog.html</link>
    <description>${escapeXml(FEED_DESCRIPTION)}</description>
    <language>en-gb</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${SITE_URL}/changelog.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;
}

export default function handler(req, res) {
  const xml = buildRss(changelog);
  res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
  res.status(200).send(xml);
}
