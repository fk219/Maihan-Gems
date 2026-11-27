import '../../styles/portal-premium.css';

/**
 * Group-level loading shell. Every data surface below this group owns an exact
 * skeleton (listings, PDP); this file is the fallback that Next paints while a
 * route's own segment is still resolving. It is deliberately a composed page
 * silhouette rather than a spinner: a centred card on the same paper field, at
 * the same type scale, so the handover into the destination is not a blank
 * flash.
 */
export default function StorefrontLoading() {
  return (
    <div className="portal-theme">
      <div className="client-frame flex min-h-screen items-center justify-center">
        <div
          className="portal-card portal-card--pad w-full max-w-xl"
          aria-busy="true"
          aria-live="polite"
        >
          <div className="portal-empty">
            <div className="portal-empty__mark" aria-hidden="true" />
            <p className="portal-empty__title">Opening the vault</p>
            <p className="portal-empty__sub">The atelier is gathering the record.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
