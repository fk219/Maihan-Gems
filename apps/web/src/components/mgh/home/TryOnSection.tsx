import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

/**
 * The try-on section is composed as one camera window: a portrait frame with
 * four corner marks, a catalogue piece inside it, and the copy stacked above
 * and below rather than split into two columns. It is an advertisement for a
 * real surface, not a staged demo. The viewer opens at the existing WebAR
 * route; when a stone has no calibrated asset the studio says so and shows the
 * catalogue record instead of substituting a model. The camera feed stays on
 * the device.
 */
export function TryOnSection() {
  return (
    <section className="mh6-tryon" aria-labelledby="mh6-tryon-title" data-reveal>
      <div className="mh6-home__wrap mh6-tryon__inner">
        <p className="mh6-eyebrow">Before you buy</p>
        <h2 id="mh6-tryon-title" className="mh6-section-title mh6-tryon__title">
          See the stone in place.
        </h2>
        <p className="mh6-tryon__copy">
          The try-on studio sets a calibrated stone against the hand or the ear. The camera feed
          stays on the device; nothing is uploaded and nothing is staged.
        </p>

        <figure className="mh6-tryon__frame">
          <div className="mh6-tryon__window">
            <span className="mh6-tryon__mark mh6-tryon__mark--tl" aria-hidden="true" />
            <span className="mh6-tryon__mark mh6-tryon__mark--tr" aria-hidden="true" />
            <span className="mh6-tryon__mark mh6-tryon__mark--bl" aria-hidden="true" />
            <span className="mh6-tryon__mark mh6-tryon__mark--br" aria-hidden="true" />
            <img
              src="/media/jew-sapphire-ring.jpg"
              alt="A sapphire and diamond ring photographed on dark velvet"
              width={1152}
              height={864}
              loading="lazy"
              decoding="async"
            />
          </div>
          <figcaption className="mh6-tryon__caption">
            Sapphire and diamond ring. Catalogue image.
          </figcaption>
        </figure>

        <Link href="/ar/webar-tz-0131" className="mh6-button">
          Open the try-on studio
          <ArrowRight aria-hidden="true" />
        </Link>
        <p className="mh6-tryon__note">
          A calibrated asset opens when one is recorded for the stone. If it is not, the studio
          says so instead of showing a stand-in.
        </p>
      </div>
    </section>
  );
}
