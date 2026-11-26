/**
 * apps/web/src/components/layout/StorefrontHeader.tsx
 *
 * The restored navbar. The client asked for the earlier arrangement and named
 * the commits to inspect; the structure below is the one the storefront
 * actually shipped between `09b98fe` and `c867dce`:
 *
 *   - the wordmark "Maihan Gems" sits at the optical centre of the bar;
 *   - the navigation is split into two wings around it;
 *   - the link set is the historical view model, not an invented one.
 *
 * Evidence for the link set: `apps/web/src/lib/mega-menu.ts` at `09b98fe`
 * (unchanged through `c867dce`) defines the four route families
 * ("Loose gemstones" /{variety}, "Matched pairs" /{variety}-pairs,
 * "Ready-made rings" /{variety}-rings, "Shop by colour" /colour/{colour})
 * plus the static "Settings" group whose links are /settings and
 * /design-your-own. Nothing here adds a destination that did not already
 * exist in that file.
 *
 * The wings:
 *   left  — Loose gemstones · Matched pairs · Ready-made rings
 *   right — Shop by colour · Settings · Design your own
 *
 * Below 1024px the two wings are replaced by a real modal drawer
 * (MobileMenu), because the previous build had no mobile navigation at all.
 *
 * The bar is two-part by design: a 32px utility rule (appointments, search,
 * account, bag) above a 78px navigation rail. The utility rule is the only
 * place account/bag live; the rail stays purely editorial. This is the
 * "iPhone-like" part of the brief: each row does one job.
 */
import { catalogServer } from '../../lib/catalog-server.js';
import { assertCanonicalHrefs, buildMegaMenu, staticMenuGroups } from '../../lib/mega-menu.js';
import { MegaMenu } from './MegaMenu.js';
import { MobileMenu } from './MobileMenu.js';

/** The historical left wing: the three catalogue families. */
const LEFT_GROUP_IDS = new Set(['gemstones', 'pairs', 'ready-made']);

export async function StorefrontHeader() {
  const taxonomy = (await catalogServer().getTaxonomy()).value;
  // The taxonomy read model filters state='ACTIVE'. Migrated reference rows are
  // DRAFT, so `buildMegaMenu` can return zero groups; the static settings entry
  // is the canonical fallback, never a fabricated family.
  const built = buildMegaMenu(taxonomy);
  const groups = built.length > 0 ? built : staticMenuGroups();
  // Guard the canonical-route contract at render time too (defence in depth;
  // the pure builder is unit-tested for this).
  assertCanonicalHrefs(groups);

  const leftGroups = groups.filter((group) => LEFT_GROUP_IDS.has(group.id));
  const rightGroups = groups.filter((group) => !LEFT_GROUP_IDS.has(group.id));

  return (
    <header className="sf-header">
      {/* Row 1 — utility. It carries no navigation groups, only the three
          destinations a customer needs on every page. */}
      <div className="sf-header__utility">
        <p className="sf-header__utility-note">Private appointments · New York</p>
        <div className="sf-header__utility-links">
          <a href="/search">Search</a>
          <a href="/account">Account</a>
          <a href="/cart">Bag</a>
        </div>
      </div>

      {/* Row 2 — the editorial rail: links, wordmark, links. */}
      <div className="sf-header__rail">
        {leftGroups.length > 0 ? (
          <MegaMenu
            groups={leftGroups}
            ariaLabel="Collections"
            className="mega-menu sf-nav sf-nav--left"
          />
        ) : (
          <span aria-hidden="true" />
        )}

        <a href="/" className="sf-wordmark">
          <span className="sf-wordmark__name">Maihan Gems</span>
          <span className="sf-wordmark__sub">Natural stones · Atelier</span>
        </a>

        <MegaMenu
          groups={rightGroups}
          ariaLabel="Atelier"
          className="mega-menu sf-nav sf-nav--right"
          directLinks={[{ label: 'Design your own', href: '/design-your-own' }]}
        />
      </div>

      {/* Mobile rail. Same wordmark, same destinations, real drawer. */}
      <div className="sf-header__mobile">
        <MobileMenu groups={groups} />
        <a href="/" className="sf-wordmark">
          <span className="sf-wordmark__name">Maihan Gems</span>
        </a>
        <a href="/cart" className="sf-header__bag">
          Bag
        </a>
      </div>
    </header>
  );
}
