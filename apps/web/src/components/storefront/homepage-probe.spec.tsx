/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AxeBuilder } from '../../lib/axe-builder.js';
import { DEFAULT_FX } from '../../lib/currency.js';
import { storefrontBySlug } from '../../lib/ngc/storefronts.js';
import { StorefrontProvider } from './StorefrontProvider.js';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => undefined, replace: () => undefined, prefetch: () => undefined }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('next/headers', () => ({
  headers: async () => new Headers(),
  cookies: async () => ({ get: () => undefined }),
}));

vi.mock('server-only', () => ({}));

vi.mock('next/image', () => ({
  default: (props: { src?: string; alt?: string }) => createElement('img', { src: props.src ?? '', alt: props.alt ?? '' }),
}));

const HomePage = (await import('../../app/(storefront)/page.js')).default;

describe('homepage redesign', () => {
  it('renders every requested section', async () => {
    document.documentElement.setAttribute('lang', 'en');
    if (document.title === '') document.title = 'Maihan Gems';
    const page = await HomePage();
    const html = renderToStaticMarkup(
      createElement(StorefrontProvider, { rates: DEFAULT_FX, children: page }),
    );
    const container = document.createElement('div');
    container.innerHTML = html;
    document.body.appendChild(container);

    expect(container.querySelectorAll('main.mgh').length).toBe(1);
    expect(container.querySelector('.mgh-hero__title')?.textContent).toContain('natural gemstones');
    expect(container.querySelector('.vitrine .ink-cta')).not.toBeNull();
    expect(container.querySelector('.vitrine form')).toBeNull();
    expect(container.querySelector('.mgh-gems h2')?.textContent).toBe('Gemstones');
    expect(container.querySelectorAll('.mgh-gem').length).toBeGreaterThanOrEqual(10);
    expect(container.querySelector('#atelier-pieces-h')?.textContent).toBe('Signature pieces');
    expect(container.querySelector('#atelier-story-h')?.textContent).toContain('disclosed');
    expect(container.querySelector('.mgh-dyo h2')?.textContent).toContain('Design your own');
    expect(container.querySelectorAll('.mgh-quote').length).toBe(0);
    expect(container.textContent).not.toContain('+971 4 000 0000');

    const results = await new AxeBuilder().analyze();
    const blocking = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    const notes = results.violations.filter((v) => v.impact !== 'critical' && v.impact !== 'serious');
    if (notes.length > 0) {
      console.warn('[probe] non-blocking:', notes.map((v) => `${v.id}(${v.impact})`).join(', '));
    }
    expect(blocking, blocking.map((v) => `${v.id}: ${v.nodes.length} nodes`).join('; ')).toEqual([]);

    container.remove();
  });

  it('photographs each sister house with its own stone', async () => {
    const cases = [
      ['sapphire', '/media/jew-sapphire-ring.jpg'],
      ['ruby', '/media/jew-ruby-ring.jpg'],
      ['emerald', '/media/jew-emerald-necklace.jpg'],
    ] as const;
    for (const [slug, main] of cases) {
      const page = await HomePage({ brand: storefrontBySlug(slug) });
      const html = renderToStaticMarkup(
        createElement(StorefrontProvider, { rates: DEFAULT_FX, children: page }),
      );
      const container = document.createElement('div');
      container.innerHTML = html;
      expect(container.querySelector('.vault-vitrine__img')?.getAttribute('src'), slug).toBe(main);
    }
  });
});
