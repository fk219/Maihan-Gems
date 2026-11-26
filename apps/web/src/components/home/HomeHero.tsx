/**
 * apps/web/src/components/home/HomeHero.tsx
 *
 * The storefront opening. One idea per viewport: ink, a single stone under a
 * raking key light, and a sentence that says exactly what the business does.
 *
 * The composition is CSS only — no photograph, no canvas, no client JS, so the
 * hero adds nothing to the initial-JS budget and cannot make LCP wait on an
 * image. The stone is openly captioned as a light study, never as a photograph
 * of a specific gemstone.
 *
 * Motion: one Enter on the copy, one Hold drift on the stone, one Pass across
 * the stone on hover of the figure. All three are the shared vocabulary; the
 * reduced-motion switch in the token layer resolves them instantly.
 *
 * Copy discipline: no "100% natural", no laboratory names, no "hand-set",
 * no shipping promise. The only claim is the one the catalogue can keep:
 * every record shows the evidence it carries.
 */
import Link from 'next/link';

export function HomeHero() {
  return (
    <section className="sf-hero" aria-labelledby="sf-hero-title">
      <div className="sf-hero__inner">
        <div className="sf-hero__copy">
          <p className="sf-hero__eyebrow">Natural gemstones · Atelier settings</p>

          <h1 className="sf-hero__title" id="sf-hero-title">
            Light,
            <br />
            <em>held</em> in stone.
          </h1>

          <p className="sf-hero__lead">
            Loose gemstones and atelier mountings, recorded one record at a time. Weight,
            colour, price and provenance appear where the record carries them — and stay
            open where it does not.
          </p>

          <div className="sf-hero__actions">
            <Link className="mh-cta" href="/search">
              Enter the collection
              <span aria-hidden="true">→</span>
            </Link>
            <Link className="mh-cta mh-cta--quiet" href="/design-your-own">
              Design your own
            </Link>
          </div>
        </div>

        <figure className="sf-hero__study" aria-label="A study of light through a step-cut stone">
          <div className="sf-stone" aria-hidden="true">
            <span className="sf-stone__key" />
            <span className="sf-stone__facet" />
            <span className="sf-stone__glint" />
            <span className="mh-light-pass" />
          </div>
          <figcaption className="sf-hero__caption">
            A study of light through a step-cut stone — not a photograph of a specific piece
          </figcaption>
        </figure>
      </div>
      <p className="sf-hero__index" aria-hidden="true">
        Maihan Gems · New York
      </p>
    </section>
  );
}
