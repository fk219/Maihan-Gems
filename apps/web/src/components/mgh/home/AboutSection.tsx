import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

/**
 * The method section is the page's warm-paper composition: a loupe view of
 * one stone against the rule the whole catalogue runs on. It publishes no
 * founding year, no client count and no press claim, because the application
 * cannot evidence them. What it does publish is the evidence vocabulary the
 * product pages actually print.
 */
export function AboutSection() {
  return (
    <section className="mh6-record" aria-labelledby="mh6-record-title" data-reveal>
      <div className="mh6-home__wrap mh6-record__grid">
        <figure className="mh6-record__figure">
          <span className="mh6-record__loupe">
            <img
              src="/media/stone-ruby.jpg"
              alt="A faceted oval ruby, photographed on a pale ground"
              width={1774}
              height={1428}
              loading="lazy"
              decoding="async"
            />
          </span>
          <figcaption className="mh6-record__caption">
            A ruby, photographed for the catalogue.
          </figcaption>
        </figure>

        <div className="mh6-record__copy">
          <p className="mh6-eyebrow">The record</p>
          <h2 id="mh6-record-title" className="mh6-section-title mh6-record__title">
            What the page will tell you, and what it will not.
          </h2>
          <p className="mh6-record__lede">
            Every stone page is built from one row. A field the row carries is printed with the
            evidence it holds; a field it does not carry is printed as missing. Nothing is
            estimated from a neighbouring stone.
          </p>

          <dl className="mh6-record__facts">
            <div>
              <dt>Carried</dt>
              <dd>
                Variety, carat, shape, origin, treatment and the report reference, exactly as the
                row holds them.
              </dd>
            </div>
            <div>
              <dt>Refused</dt>
              <dd>
                A field with no entry is shown as not recorded. The page does not infer it from a
                similar stone.
              </dd>
            </div>
            <div>
              <dt>Marked</dt>
              <dd>
                An inferred value stays labelled inferred, and never renders as verified.
              </dd>
            </div>
          </dl>

          <Link href="/education/reading-a-record" className="mh6-button">
            How to read a record
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
