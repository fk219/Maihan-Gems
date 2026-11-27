import Link from 'next/link';

/**
 * Try-on is one image and one line. The photograph is a catalogue photograph,
 * captioned as one; the camera promise is the feature's real behaviour (frames
 * stay on the device); and the caption states exactly when the studio opens —
 * when a calibrated asset is recorded for the stone. Until then the AR route
 * says so itself instead of showing a stand-in.
 */
export function TryOnSection() {
  return (
    <section className="v11-section" aria-labelledby="v11-tryon-title">
      <div className="v11-wrap v11-tryon__grid">
        <div className="v11-tryon__copy">
          <h2 id="v11-tryon-title" className="v11-statement v11-enter">
            See the stone in place.
          </h2>
          <p className="v11-line v11-enter">
            The try-on studio sets a calibrated stone against the hand or the ear, and the
            camera feed stays on your device.
          </p>
          <Link href="/ar/webar-tz-0131" className="v11-action v11-enter">
            Open the try-on studio
            <span aria-hidden="true" className="v11-action__arrow">
              →
            </span>
          </Link>
          <p className="v11-caption">
            A calibrated asset opens when one is recorded for the stone. If it is not, the
            studio says so instead of showing a stand-in.
          </p>
        </div>

        <figure className="v11-tryon__figure v11-enter-media">
          <div className="v11-tryon__plate">
            <img
              src="/media/jew-sapphire-ring.jpg"
              alt="A sapphire and diamond ring photographed on dark velvet"
              width={1152}
              height={864}
              loading="lazy"
              decoding="async"
            />
          </div>
          <figcaption className="v11-caption v11-tryon__figcap">
            Sapphire and diamond ring. Catalogue photograph.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
