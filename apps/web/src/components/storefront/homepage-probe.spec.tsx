/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AxeBuilder } from '../../lib/axe-builder.js';
import { StorefrontProvider } from './StorefrontProvider.js';
import { DEFAULT_FX } from '../../lib/currency.js';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => undefined, replace: () => undefined, prefetch: () => undefined }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
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
    expect(container.querySelector('.mgh-gems h2')?.textContent).toBe('Gemstones');
    expect(container.querySelectorAll('.mgh-gem').length).toBeGreaterThanOrEqual(10);
    expect(container.querySelector('.mgh-jewellery h2')?.textContent).toContain('Jewellery');
    expect(container.querySelectorAll('.mgh-jew').length).toBe(4);
    expect(container.querySelector('.mgh-pack h2')?.textContent).toContain('Packaging');
    expect(container.querySelectorAll('.mgh-pack__item').length).toBe(5);
    expect(container.querySelector('.mgh-dyo h2')?.textContent).toContain('Design Your Own');
    expect(container.querySelectorAll('.mgh-steps li').length).toBe(3);
    expect(container.querySelector('.mgh-history h2')?.textContent).toContain('History');
    expect(container.querySelectorAll('.mgh-history__card').length).toBe(3);
    expect(container.querySelector('.mgh-peace h2')?.textContent).toContain('Peace');
    expect(container.querySelectorAll('.mgh-peace__card').length).toBe(4);
    expect(container.querySelector('.mgh-about h2')?.textContent).toContain('About');
    expect(container.querySelector('.mgh-charity h2')?.textContent).toContain('Charity');
    expect(container.querySelector('.mgh-feedback h2')?.textContent).toContain('Feedback');
    expect(container.querySelectorAll('.mgh-quote').length).toBe(3);

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
