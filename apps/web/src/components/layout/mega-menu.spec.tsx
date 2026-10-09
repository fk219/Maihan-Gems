/**
 * apps/web/src/components/layout/mega-menu.spec.tsx
 *
 * Task 9 — interactive behaviour of the client island, rendered with the real
 * component and exercised through DOM events:
 *  - structure/semantics: <nav aria-label>, one toggle per group with
 *    aria-expanded/aria-controls, panels hidden until opened;
 *  - keyboard: Escape closes the open panel and returns focus to its trigger;
 *  - open/close toggling; outside click closes;
 *  - links are real anchors to canonical routes;
 *  - no focus trap: tab order is DOM order (the component renders no
 *    tabindex manipulation — asserted structurally).
 *
 * React's `hidden` attribute + testing-library-free DOM assertions keep this
 * deterministic without a browser.
 *
 * @vitest-environment happy-dom
 */
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRoot } from 'react-dom/client';
import { act } from 'react';

// Tell React this is an act()-aware test environment (silences the
// "not configured to support act(...)" warning; happy-dom IS one here).
beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

import { MegaMenu } from './MegaMenu.js';
import { buildMegaMenu } from '../../lib/mega-menu.js';
import { emptyTaxonomy } from '../../modules/catalog/testing/doubles.js';
import type { TaxonomyReadModel } from '@maihan/contracts';

function taxonomy(): TaxonomyReadModel {
  const base = emptyTaxonomy();
  return {
    ...base,
    varieties: [
      { slug: 'tsavorite-garnet', name: 'Tsavorite', display_name: 'Tsavorite Garnet', species_code: 'GARNET', source_route: '/tsavorite-garnet', is_organic: false, state: 'ACTIVE', evidence_status: 'OBSERVED' },
    ],
    colours: [],
  } as TaxonomyReadModel;
}

const groups = buildMegaMenu(taxonomy());

const S = (ui: React.ReactElement): string => renderToStaticMarkup(ui);

describe('MegaMenu — server-rendered semantics (SSR markup)', () => {
  it('renders a named navigation with toggle buttons and hidden panels', () => {
    const html = S(<MegaMenu groups={groups} />);
    expect(html).toContain('<nav class="mega-menu" aria-label="Main"');
    expect(html).toContain('<button type="button"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-controls=');
    // Panels are hidden (not in the a11y tree / tab order) until opened.
    expect(html).toContain('hidden');
  });

  it('exposes every link as a real anchor to the canonical route', () => {
    const html = S(<MegaMenu groups={groups} />);
    expect(html).toContain('href="/tsavorite-garnet"');
    expect(html).toContain('href="/tsavorite-garnet-pairs"');
    expect(html).toContain('href="/tsavorite-garnet-rings"');
    expect(html).toContain('href="/settings"');
    expect(html).toContain('href="/design-your-own"');
  });

  it('renders empty taxonomy as the static entries only (no broken panels)', () => {
    const html = S(<MegaMenu groups={buildMegaMenu(emptyTaxonomy())} />);
    expect(html).toContain('Settings');
    expect(html).not.toContain('Loose gemstones');
  });

  it('does not manipulate tab order (no positive tabindex, no focus trap)', () => {
    const html = S(<MegaMenu groups={groups} />);
    expect(/tabindex="[1-9]"/.test(html)).toBe(false);
    expect(html).not.toContain('tabIndex');
  });
});

// The interactive suites run the real client component in a DOM.
describe('MegaMenu — interactive behaviour', () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  afterEach(() => {
    if (root !== null && container !== null) {
      act(() => root!.unmount());
    }
    root = null;
    container?.remove();
    container = null;
  });

  function mount(): { doc: Document; container: HTMLDivElement } {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root!.render(<MegaMenu groups={groups} />));
    return { doc: document, container };
  }

  it('opens a panel on trigger click and closes it on second click', () => {
    const { doc } = mount();
    const trigger = doc.querySelector<HTMLButtonElement>('button[aria-controls]')!;
    expect(trigger.getAttribute('aria-expanded')).toBe('false');

    act(() => trigger.click());
    const panel = doc.getElementById(trigger.getAttribute('aria-controls')!);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(panel?.hasAttribute('hidden')).toBe(false);
    expect(panel?.querySelector('a')?.getAttribute('href')).toBe('/tsavorite-garnet');

    act(() => trigger.click());
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(panel?.hasAttribute('hidden')).toBe(true);
  });

  it('closes the open panel on Escape and returns focus to the trigger', () => {
    const { doc } = mount();
    const trigger = doc.querySelector<HTMLButtonElement>('button[aria-controls]')!;
    act(() => trigger.click());
    expect(trigger.getAttribute('aria-expanded')).toBe('true');

    act(() => {
      doc.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(doc.activeElement).toBe(trigger);
  });

  it('closes when a click lands outside the menu', () => {
    const { doc, container } = mount();
    const trigger = doc.querySelector<HTMLButtonElement>('button[aria-controls]')!;
    act(() => trigger.click());
    expect(trigger.getAttribute('aria-expanded')).toBe('true');

    act(() => {
      // A mousedown that does NOT originate inside the menu root.
      container!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });
});
