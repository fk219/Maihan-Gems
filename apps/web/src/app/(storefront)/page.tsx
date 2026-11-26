/**
 * apps/web/src/app/(storefront)/page.tsx — `/`
 *
 * The storefront frontispiece. It is a catalogue cover, not a campaign page:
 * one statement, three doors, the published varieties, the colour families
 * and three real mounting designs.
 *
 * Every value comes from the Phase 3 catalogue service. There is no marquee,
 * no invented certification, no "100% natural" claim, no shipping promise and
 * no trust badge. The only promise on the page is the evidence rule the
 * product pages actually enforce (INV-07).
 *
 * If the taxonomy is empty, the page says so and offers the routes that still
 * work — a purpose-built empty state, never a wall of placeholder cards.
 */
import type { Metadata } from 'next';
import Link from 'next/link';

import { HomeHero } from '../../components/home/HomeHero.js';
import { LightPlate } from '../../components/design-system/LightPlate.js';
import { catalogServer } from '../../lib/catalog-server.js';
import { browsableColours, browsableVarieties } from '../../lib/catalog-view.js';

// The page reads request-time catalogue data. Forcing dynamic keeps
// `next build` database-free (the build gate runs with DATABASE_URL unset).
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Maihan Gems — Natural gemstones and atelier mountings',
  description:
    'Loose gemstones, matched pairs, ready-made rings and atelier settings, catalogued with the evidence each record carries.',
};

export default async function HomePage() {
  const service = catalogServer();
  const [taxonomyResult, settingsResult] = await Promise.all([
    service.getTaxonomy(),
    service.listSettings({ limit: 3 }),
  ]);

  const varieties = browsableVarieties(taxonomyResult.value);
  const colours = browsableColours(taxonomyResult.value);
  const settings = settingsResult.value.items;
  const shownVarieties = varieties.slice(0, 9);

  return (
    <main className="sf-home" id="main-content">
      <HomeHero />

      {/* The catalogue's position, in two voices: a statement and a note. */}
      <section className="sf-home__lede" aria-label="About the catalogue">
        <p>
          A gemstone is not a colour. It is a <span className="sf-gold-word">path of light</span>,
          and a record is the only honest way to describe it.
        </p>
        <p className="sf-home__lede-note">
          Maihan Gems publishes natural stones and atelier mountings. Each product page states
          what the record contains: weight, colour, cut, price, availability and the evidence
          behind each value. Where a field is absent, the page says so rather than inventing it.
        </p>
      </section>

      {/* Three doors, one job each. */}
      <nav className="sf-home__doors" aria-label="Start browsing">
        <Link className="sf-door" href="/varieties">
          <span className="sf-door__index">01</span>
          <span>
            <span className="sf-door__title">Loose gemstones</span>
            <span className="sf-door__note">
              Browse by mineral variety, then open the stones recorded under it.
            </span>
          </span>
          <span className="sf-door__cue">
            The varieties <span aria-hidden="true">→</span>
          </span>
        </Link>

        <Link className="sf-door" href="/settings">
          <span className="sf-door__index">02</span>
          <span>
            <span className="sf-door__title">Atelier settings</span>
            <span className="sf-door__note">
              Mounting designs with the metal variants, prices and evidence each record carries.
            </span>
          </span>
          <span className="sf-door__cue">
            The mountings <span aria-hidden="true">→</span>
          </span>
        </Link>

        <Link className="sf-door" href="/design-your-own">
          <span className="sf-door__index">03</span>
          <span>
            <span className="sf-door__title">Design your own</span>
            <span className="sf-door__note">
              Pair one mounting with one stone, or a matched pair with earrings. The rule is
              enforced, not suggested.
            </span>
          </span>
          <span className="sf-door__cue">
            The configurator <span aria-hidden="true">→</span>
          </span>
        </Link>
      </nav>

      {/* Variety index — the catalogue's real table of contents. */}
      <section className="sf-section" aria-labelledby="home-varieties">
        <div className="sf-section__head">
          <div>
            <p className="sf-eyebrow">The table of contents</p>
            <h2 className="sf-section__title" id="home-varieties">
              Published varieties
            </h2>
          </div>
          <p className="sf-section__note">
            Only ACTIVE varieties appear. Each entry opens the loose-stone listing; the pair
            listing is one step further in.
          </p>
        </div>

        {shownVarieties.length === 0 ? (
          <div className="empty-state">
            <h3 className="empty-state__title">No varieties are published yet.</h3>
            <p className="empty-state__body">
              The directory is driven by the taxonomy. When a variety is marked ACTIVE it appears
              here, with no hardcoded list in between.
            </p>
            <div className="empty-state__action">
              <Link className="mh-cta" href="/search">
                Search the catalogue
              </Link>
              <Link className="mh-cta mh-cta--quiet" href="/settings">
                Browse settings
              </Link>
            </div>
          </div>
        ) : (
          <>
            <ul className="sf-variety-list">
              {shownVarieties.map((variety) => (
                <li key={variety.slug}>
                  <Link href={`/${variety.slug}`}>
                    <span className="sf-variety-name">{variety.name}</span>
                    <span className="sf-variety-meta">
                      Loose · Pairs <span aria-hidden="true">→</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {varieties.length > shownVarieties.length && (
              <p style={{ marginTop: 24 }}>
                <Link className="sf-text-link" href="/varieties">
                  All {varieties.length} varieties <span aria-hidden="true">→</span>
                </Link>
              </p>
            )}
          </>
        )}
      </section>

      {/* Colour families. Text chips, not colour pills: the name is the datum. */}
      {colours.length > 0 && (
        <section className="sf-section" aria-labelledby="home-colours">
          <div className="sf-section__head">
            <div>
              <p className="sf-eyebrow">The spectrum</p>
              <h2 className="sf-section__title" id="home-colours">
                Shop by colour
              </h2>
            </div>
            <p className="sf-section__note">
              A colour family is a catalogue grouping, not a promise of hue, tone or saturation.
              The stone record carries those fields where they are known.
            </p>
          </div>
          <ul className="sf-colour-row">
            {colours.map((colour) => (
              <li key={colour.slug}>
                <Link href={`/colour/${colour.slug}`}>{colour.name}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Three real mounting designs. A design has no headline price, so the
          preview shows the recorded style and metal count, never a guess. */}
      <section className="sf-section" aria-labelledby="home-settings">
        <div className="sf-section__head">
          <div>
            <p className="sf-eyebrow">The atelier</p>
            <h2 className="sf-section__title" id="home-settings">
              Mounting designs
            </h2>
          </div>
          <p className="sf-section__note">
            Each design lists the metal variants it actually has. A design without a price is
            shown as “price on request”, not with a plausible number.
          </p>
        </div>

        {settings.length === 0 ? (
          <div className="empty-state">
            <h3 className="empty-state__title">No mounting designs are published.</h3>
            <p className="empty-state__body">
              The setting catalogue is read from the same service as the listing page. When a
              design is recorded it appears here.
            </p>
            <div className="empty-state__action">
              <Link className="mh-cta" href="/settings">
                Open the settings index
              </Link>
            </div>
          </div>
        ) : (
          <ul className="product-grid sf-settings-preview">
            {settings.map((setting) => (
              <li key={setting.design_code}>
                <article className="mh-card">
                  <div className="mh-card__status">
                    <span className="mh-card__kind">{setting.jewellery_type.toLowerCase()}</span>
                    <span className="mh-card__ref">{setting.design_code}</span>
                  </div>
                  <Link className="mh-card__link" href={`/settings/${setting.design_code}`}>
                    <LightPlate caption="No photograph on file" />
                    <div className="mh-card__body">
                      <h3 className="mh-card__title">{setting.name}</h3>
                      <p className="mh-card__meta">
                        {setting.style !== null ? `${setting.style.label} · ` : ''}
                        {setting.variant_count} metal option
                        {setting.variant_count === 1 ? '' : 's'}
                      </p>
                      <div className="mh-card__foot">
                        <span className="mh-card__cue">
                          View design <span aria-hidden="true">→</span>
                        </span>
                      </div>
                    </div>
                  </Link>
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* The process, stated as a rule rather than a romance. */}
      <section className="sf-section" aria-labelledby="home-process">
        <div className="sf-section__head">
          <div>
            <p className="sf-eyebrow">How a piece is assembled</p>
            <h2 className="sf-section__title" id="home-process">
              One mounting, one stone
            </h2>
          </div>
          <p className="sf-section__note">
            The configurator composes the piece; the catalogue service validates the composition
            against the same invariants the database enforces.
          </p>
        </div>
        <div className="sf-process">
          <div className="sf-process__step">
            <h3>Choose the mounting</h3>
            <p>
              Open a design and compare its recorded metal variants. The base price belongs to the
              variant, not to the design, so nothing is averaged.
            </p>
          </div>
          <div className="sf-process__step">
            <h3>Choose the stone</h3>
            <p>
              A single stone attaches to a ring, pendant, necklace or bracelet. A matched pair
              attaches only to earrings. The rule is INV-02/03.
            </p>
          </div>
          <div className="sf-process__step">
            <h3>Review the record</h3>
            <p>
              The review page repeats the configuration and its evidence statuses. A quote is
              issued separately; the page never prints a total it cannot support.
            </p>
          </div>
        </div>
      </section>

      {/* The one promise the platform can keep. */}
      <section className="sf-evidence" aria-labelledby="home-evidence">
        <h2 id="home-evidence">
          Evidence,
          <br />
          not adjectives.
        </h2>
        <div>
          <p>
            <code>INV-07</code> A specification is presented as verified only when its stored
            evidence status is VERIFIED. Every other status is shown beside the value it
            qualifies.
          </p>
          <p>
            <code>INV-08</code> A derived identifier is not a confirmed external reference until
            its review state is APPROVED. Until then the storefront labels it as derived.
          </p>
          <p>
            <Link className="sf-text-link" href="/policy/provenance">
              Read the provenance policy <span aria-hidden="true">→</span>
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
