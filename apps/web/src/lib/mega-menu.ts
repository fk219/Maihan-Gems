/**
 * apps/web/src/lib/mega-menu.ts
 *
 * Mega-menu view model (Phase 4 Task 9).
 *
 * Authority: SoT 12.2 ("layout.tsx # header, mega menu, footer, chat
 * launcher"), doc 08 (layout/ Header, MegaMenu, MobileNav; "> 1024px full
 * mega menu"), SoT 13.1 (the preserved route families the menu links to).
 *
 * Rules honoured here:
 *   - NO hard-coded catalogue: varieties and colours come from the Phase 3
 *     taxonomy read model (ACTIVE only), via the SAME browsable* helpers the
 *     catalogue pages use. A variety that is not ACTIVE never renders.
 *   - Groups are the documented route FAMILIES (13.1), not invented
 *     categories: Loose gemstones /{variety}, Matched pairs /{variety}-pairs,
 *     Ready-made rings /{variety}-rings, Colour families /colour/{colour},
 *     plus the static Settings and Design-Your-Own entries. No special-cased
 *     variety or product anywhere.
 *   - Empty taxonomy -> empty groups; the menu still renders (the static
 *     entries remain) rather than breaking the navigation.
 *   - Pure and deterministic: identical taxonomy in, identical menu out.
 */
import type { TaxonomyReadModel } from '@maihan/contracts';

import { browsableColours, browsableVarieties, type VarietyLink } from './catalog-view.js';

export interface MenuLink {
  readonly label: string;
  readonly href: string;
}

export interface MenuGroup {
  readonly id: string;
  readonly label: string;
  readonly links: readonly MenuLink[];
}

/** Static canonical entries — the preserved non-catalogue routes (SoT 13.1). */
export function staticMenuGroups(): readonly MenuGroup[] {
  return [
    {
      id: 'settings',
      label: 'Settings',
      links: [
        { label: 'All settings', href: '/settings' },
        { label: 'Design your own', href: '/design-your-own' },
      ],
    },
  ];
}

/**
 * Build the menu from the taxonomy. Deterministic ordering comes from the
 * browsable* helpers (name-ordered); groups keep a fixed documented order.
 */
export function buildMegaMenu(taxonomy: TaxonomyReadModel): readonly MenuGroup[] {
  const varieties: readonly VarietyLink[] = browsableVarieties(taxonomy);
  const colours: readonly VarietyLink[] = browsableColours(taxonomy);

  const catalogueGroups: readonly MenuGroup[] = [
    {
      id: 'gemstones',
      label: 'Loose gemstones',
      links: varieties.map((v) => ({ label: v.name, href: `/${v.slug}` })),
    },
    {
      id: 'pairs',
      label: 'Matched pairs',
      links: varieties.map((v) => ({ label: v.name, href: `/${v.slug}-pairs` })),
    },
    {
      id: 'ready-made',
      label: 'Ready-made rings',
      links: varieties.map((v) => ({ label: v.name, href: `/${v.slug}-rings` })),
    },
    {
      id: 'colours',
      label: 'Shop by colour',
      links: colours.map((c) => ({ label: c.name, href: `/colour/${c.slug}` })),
    },
  ];

  // Groups with no links are dropped: an empty flyout panel would be an
  // empty interactive region for keyboard and screen-reader users.
  return [...catalogueGroups, ...staticMenuGroups()].filter((g) => g.links.length > 0);
}

/** Every href in the menu must be a canonical application route. */
export function assertCanonicalHrefs(groups: readonly MenuGroup[]): void {
  const canonical = [
    /^\/$/,
    /^\/settings$/,
    /^\/design-your-own$/,
    /^\/colour\/[a-z0-9-]+$/,
    /^\/[a-z0-9-]+$/, // /{variety}
    /^\/[a-z0-9-]+-pairs$/,
    /^\/[a-z0-9-]+-rings$/,
  ];
  for (const group of groups) {
    for (const link of group.links) {
      if (!canonical.some((re) => re.test(link.href))) {
        throw new Error(`mega-menu: non-canonical href "${link.href}" in group "${group.label}"`);
      }
    }
  }
}
