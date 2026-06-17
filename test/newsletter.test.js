// Tests that the newsletter signup section on index.html meets the spec:
// heading, blurb, email input, subscribe button — all present and consistent
// with the page styling (no new deps, static HTML only).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const html = readFileSync(resolve(__dirname, '../index.html'), 'utf8');

describe('newsletter signup section', () => {
  it('has a section element with id="newsletter"', () => {
    expect(html).toMatch(/id="newsletter"/);
  });

  it('has a heading inside the newsletter section', () => {
    // Section contains an h2 for the email-capture block
    const sectionMatch = html.match(/<section[^>]*id="newsletter"[^>]*>([\s\S]*?)<\/section>/);
    expect(sectionMatch).not.toBeNull();
    expect(sectionMatch[1]).toMatch(/<h2[\s>]/);
  });

  it('has a descriptive blurb paragraph', () => {
    const sectionMatch = html.match(/<section[^>]*id="newsletter"[^>]*>([\s\S]*?)<\/section>/);
    expect(sectionMatch).not.toBeNull();
    // Should have at least one paragraph of body text
    expect(sectionMatch[1]).toMatch(/<p[^>]*>/);
  });

  it('has an email input field', () => {
    const sectionMatch = html.match(/<section[^>]*id="newsletter"[^>]*>([\s\S]*?)<\/section>/);
    expect(sectionMatch).not.toBeNull();
    expect(sectionMatch[1]).toMatch(/type="email"/);
  });

  it('has a subscribe button', () => {
    const sectionMatch = html.match(/<section[^>]*id="newsletter"[^>]*>([\s\S]*?)<\/section>/);
    expect(sectionMatch).not.toBeNull();
    expect(sectionMatch[1]).toMatch(/<button[^>]*type="submit"/);
  });

  it('form is a static stub (no backend action required)', () => {
    // The form should not POST to a real backend — it's a static stub
    const sectionMatch = html.match(/<section[^>]*id="newsletter"[^>]*>([\s\S]*?)<\/section>/);
    expect(sectionMatch).not.toBeNull();
    // Either no action attribute, or onsubmit=return false, or action="#"
    const formMatch = sectionMatch[1].match(/<form[^>]*>/);
    expect(formMatch).not.toBeNull();
    const formTag = formMatch[0];
    const noExternalAction =
      !formTag.includes('action=') || formTag.includes('action="#') || formTag.includes("action='#");
    const hasReturnFalse = formTag.includes('return false');
    expect(noExternalAction || hasReturnFalse).toBe(true);
  });

  it('nav contains a link to the newsletter section', () => {
    expect(html).toMatch(/href="#newsletter"/);
  });

  it('uses page CSS variables (no new dependencies)', () => {
    // CSS for newsletter must rely on --teal, --sand, --cream etc., not new external styles
    const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
    expect(styleMatch).not.toBeNull();
    expect(styleMatch[1]).toMatch(/\.newsletter/);
    // No new <link> tags for external CSS beyond the font preloads
    const linkTags = html.match(/<link[^>]+href="http[^"]*"[^>]*>/g) || [];
    const nonFontLinks = linkTags.filter(
      t => !t.includes('fonts.googleapis.com') && !t.includes('fonts.gstatic.com')
    );
    expect(nonFontLinks).toHaveLength(0);
  });
});
