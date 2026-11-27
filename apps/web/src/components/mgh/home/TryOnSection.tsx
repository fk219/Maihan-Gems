import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

/**
 * The try-on section is an advertisement for a real surface, not a staged
 * demo. The viewer opens at the existing WebAR route; when a stone has no
 * calibrated asset the studio says so and shows the catalogue record instead
 * of substituting a model. The camera feed is described honestly: it stays on
 * the device.
 */
export function TryOnSection() {
  return (
    <section className="mh6-tryon" aria-labelledby="mh6-tryon-title" data-reveal>
      <div className="mh6-home__wrap">
        <div className="mh6-tryon__plate">
          <div className="mh6-tryon__media" aria-hidden="true">
            <img
              src="/mgh/images/gems/emerald-gem.jpg"
              alt=""
              width={1200}
              height={1500}
              loading="lazy"
              decoding="async"
            />
          </div>
          <div className="mh6-tryon__scrim" aria-hidden="true" />
          <span className="mh6-tryon__reticle" aria-hidden="true" />

          <div className="mh6-tryon__content">
            <h2 id="mh6-tryon-title" className="mh6-tryon__title">
              See the stone in place.
            </h2>
            <p className="mh6-tryon__copy">
              The try-on studio sets a calibrated stone against the hand or the ear and keeps the
              camera feed on the device. Nothing is uploaded and nothing is staged.
            </p>
            <Link href="/ar/webar-tz-0131" className="mh6-button mh6-button--dark">
              Open the try-on studio
              <ArrowRight aria-hidden="true" />
            </Link>
            <p className="mh6-tryon__note">
              A calibrated asset opens when one is recorded for the stone. If it is not, the
              studio says so instead of showing a stand-in.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
