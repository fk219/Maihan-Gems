import { ArrowLink } from './ArrowLink';

/**
 * Try-on, shown as a device rather than a promise: a stone ring inside a
 * phone frame, one line, one action. The photograph is the catalogue's
 * representative diamond ring and is captioned as a catalogue photograph. The
 * studio itself states when a stone has no calibrated asset rather than
 * showing a stand-in, and the camera feed never leaves the device.
 */
export function TryOnSection() {
  return (
    <section className="mh12-tryon" data-section="try-on" aria-labelledby="mh12-tryon-title">
      <div className="mh12-wrap mh12-tryon__grid">
        <div className="mh12-tryon__copy">
          <h2 id="mh12-tryon-title" className="mh12-h2">
            See it on your hand.
          </h2>
          <p className="mh12-tryon__line">
            A calibrated stone against the hand or the ear, with the camera staying on your
            device.
          </p>
          <ArrowLink href="/ar/webar-tz-0131">Open the try-on studio</ArrowLink>
        </div>

        <figure className="mh12-tryon__phone">
          <span className="mh12-tryon__screen">
            <span className="mh12-tryon__glass">
              <img
                src="/mgh/images/gems/setting-ring.jpg"
                alt="A diamond ring photographed on a dark box, a catalogue photograph"
                width={1200}
                height={800}
                loading="lazy"
                decoding="async"
              />
            </span>
          </span>
          <figcaption className="mh12-label mh12-tryon__caption">
            Illustrative photograph
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
