/**
 * @vitest-environment happy-dom
 *
 * M2a probe — the (storefront) homepage is the migrated MaihanGems reference
 * homepage (golden-cloud layout) wired to the repo's real catalogue through
 * lib/mgh/adapters/catalog. Assertions cover the reference structure markers
 * that are copy-driven (stable) and treat the featured grid as data-driven:
 * whatever the real catalogue evidences is what renders.
 */
import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AxeBuilder } from '../../lib/axe-builder.js';
import { StorefrontProvider as AppletStorefrontProvider } from '../mgh/providers/StorefrontProvider.js';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => undefined, replace: () => undefined, prefetch: () => undefined }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

const HomePage = (await import('../../app/(storefront)/page.js')).default;

describe('homepage (M2a migrated reference)', () => {
  it('renders the golden-cloud reference sections over the real catalogue', async () => {
    document.documentElement.setAttribute('lang', 'en');
    if (document.title === '') document.title = 'Maihan Gems';
    const page = await HomePage();
    const html = renderToStaticMarkup(
      createElement(AppletStorefrontProvider, null, page),
    );
    const container = document.createElement('div');
    container.innerHTML = html;
    document.body.appendChild(container);

    // Reference structure markers (reference-applet homepage, 1:1)
    expect(container.querySelector('.golden-cloud-gallery')).not.toBeNull();
    expect(container.querySelector('[data-testid="hero-background-video"]')).not.toBeNull();
    expect(container.querySelector('video[src="/mgh/videos/hero-gemstone.mp4"], video > source[src="/mgh/videos/hero-gemstone.mp4"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="hero-ai-search-container"]')).not.toBeNull();
    expect(container.querySelector('h1')?.textContent).toContain('Gemstones');
    expect(container.textContent).toContain('Eight Natural Gemstone Families');

    // Gemstone marquee — fixture editorial content, 8 families, tripled track
    const marquee = container.querySelector('[data-testid="gemstone-category-marquee"]');
    expect(marquee).not.toBeNull();
    expect(container.querySelectorAll('[data-testid="gemstone-marquee-item"]').length).toBeGreaterThanOrEqual(8);

    // Featured grid is data-driven: the header is copy, the cards are real stock
    expect(container.textContent).toContain('Featured Natural Gemstones');

    // Shop-by-category: four verbatim editorial cards
    expect(container.querySelectorAll('[data-testid="shop-by-category-card"]').length).toBe(4);
    expect(container.querySelector('[data-testid="shop-by-category-card"]')?.textContent).toContain('Rings');

    // DYOJ, AI gemologist, client voices, next step — verbatim editorial copy
    expect(container.textContent).toContain('Create a custom piece in three simple steps.');
    expect(container.textContent).toContain('A gemologist’s eye, on demand.');
    expect(container.textContent).toContain('READY TO WEAR');
    expect(container.querySelectorAll('blockquote').length).toBe(3);
    expect(container.textContent).toContain('Talk to a gemologist.');

    const results = await new AxeBuilder().analyze();
    const blocking = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    const notes = results.violations.filter((v) => v.impact !== 'critical' && v.impact !== 'serious');
    if (notes.length > 0) {
      console.warn('[probe] non-blocking:', notes.map((v) => `${v.id}(${v.impact})`).join(', '));
    }
    expect(blocking, blocking.map((v) => `${v.id}: ${v.nodes.length} nodes`).join('; ')).toEqual([]);

    container.remove();
  });
});
