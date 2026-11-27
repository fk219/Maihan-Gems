import Link from 'next/link';

/**
 * The vendor programme is a quiet closing register, not a hero. The proof is
 * the shipped portal door: the sign-in surface at `/vendor/login`, captured
 * with empty fields and no account data.
 *
 * The section makes one claim the application can keep: the portal opens only
 * for a vendor the platform has approved.
 */
export function VendorSection() {
  return (
    <section className="v9-vendor" aria-labelledby="v9-vendor-title" data-reveal>
      <div className="v9-wrap v9-vendor__grid">
        <div className="v9-vendor__copy">
          <p className="v9-eyebrow">Vendor programme</p>
          <h2 id="v9-vendor-title" className="v9-display v9-vendor__title">
            The vendor portal.
          </h2>
          <p className="v9-promise">
            Consign stock, follow orders and read statements in one portal, opened only to
            approved suppliers of the atelier.
          </p>
          <p className="v9-vendor__note">
            Approval is checked before any stock, order or statement surface opens.
          </p>
          <Link href="/vendor/login" className="v9-action">
            Open the vendor portal
            <span aria-hidden="true" className="v9-action__arrow">
              →
            </span>
          </Link>
        </div>

        <figure className="v9-vendor__figure">
          <img
            src="/proof/vendor.jpg"
            alt="The vendor portal sign-in card, with empty email and password fields"
            width={720}
            height={1000}
            loading="lazy"
            decoding="async"
          />
          <figcaption className="v9-vendor__caption">
            The vendor portal door, captured from <span className="v9-mono">/vendor/login</span>.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
