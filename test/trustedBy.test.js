// Tests for the TrustedBy component (../components/TrustedBy.js).
import { describe, expect, it } from 'vitest';
import { TrustedBy, DEFAULT_LOGOS } from '../components/TrustedBy.js';

describe('TrustedBy', () => {
  it('renders a section with the "Trusted by" heading', () => {
    const html = TrustedBy();
    expect(html).toContain('<section');
    expect(html).toContain('</section>');
    expect(html).toContain('Trusted by');
  });

  it('renders exactly five placeholder logo boxes by default', () => {
    expect(DEFAULT_LOGOS).toHaveLength(5);
    const html = TrustedBy();
    const matches = html.match(/class="trusted-by-logo"/g) ?? [];
    expect(matches).toHaveLength(5);
    for (const name of DEFAULT_LOGOS) {
      expect(html).toContain(name);
    }
  });

  it('renders bordered boxes with muted colours', () => {
    const html = TrustedBy();
    expect(html).toContain('border:1px solid #ddd');
    expect(html).toContain('color:#888');
  });

  it('lays the logos out in a horizontal, spaced row', () => {
    const html = TrustedBy();
    expect(html).toContain('display:flex');
    expect(html).toContain('gap:1.5rem');
  });

  it('accepts a custom list of logo names', () => {
    const html = TrustedBy({ logos: ['Acme', 'Wonka'] });
    expect(html).toContain('Acme');
    expect(html).toContain('Wonka');
    const matches = html.match(/class="trusted-by-logo"/g) ?? [];
    expect(matches).toHaveLength(2);
  });

  it('escapes untrusted logo names', () => {
    const html = TrustedBy({ logos: ['<script>"x"'] });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&quot;x&quot;');
  });
});
