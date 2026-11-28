import { SectionAction } from './SectionAction';

/**
 * Virtual try-on, shown as a device rather than a promise: one stone
 * photograph inside a phone frame, the headline and the action on the same
 * optical line, and a caption that says the photograph is illustrative.
 *
 * The studio itself states when a stone has no calibrated asset instead of
 * showing a stand-in, and the camera feed never leaves the device. The phone
 * frame is the page's only device, so it reads as evidence of a tool rather
 * than as ornament.
 */
export function TryOnSection() {
  return (
    <section className="mh14-tryon" data-section="try-on" aria-labelledby="mh14-tryon-title">
      <div className="mh14-wrap mh14-tryon__stage">
        <div className="mh14-tryon__copy">
          <h2 id="mh14-tryon-title" className="mh14-h2">
            See it on your hand.
          </h2>
          <p className="mh14-lede mh14-lede--dark">
            A calibrated stone against the hand or the ear, with the camera staying on your
            device.
          </p>
          <SectionAction href="/ar/webar-tz-0131" tone="dark">
            Open the try-on studio
          </SectionAction>
        </div>

        <figure className="mh14-tryon__phone">
          <span className="mh14-tryon__screen">
            <span className="mh14-tryon__glass">
              <img
                src="/media/jew-sapphire-ring.jpg"
                alt="A sapphire and diamond ring photographed on black velvet, an illustrative photograph"
                width={1152}
                height={864}
                loading="lazy"
                decoding="async"
              />
            </span>
          </span>
          <figcaption className="mh14-tryon__caption">Illustrative photograph</figcaption>
        </figure>
      </div>
    </section>
  );
}
