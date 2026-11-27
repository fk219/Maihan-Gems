import Link from 'next/link';

/**
 * The vendor programme is a quiet closing register, not a hero. It carries no
 * photograph: the portal is a sign-in surface, and a picture of a login card is
 * not evidence of anything. The section makes one claim the application can
 * keep: the portal opens only for a vendor the platform has approved.
 */
export function VendorSection() {
  return (
    <section className="v9-vendor" aria-labelledby="v9-vendor-title" data-reveal>
      <div className="v9-wrap v9-vendor__inner">
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
    </section>
  );
}
