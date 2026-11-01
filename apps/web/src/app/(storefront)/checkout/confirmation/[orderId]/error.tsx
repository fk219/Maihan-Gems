'use client';

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="portal-section" role="alert" style={{ maxWidth: 720, margin: '0 auto' }}>
      <div className="portal-card portal-card--pad">
        <p className="portal-kicker">Order confirmation</p>
        <h1 className="portal-page-title">We could not load this confirmation.</h1>
        <p className="portal-page-sub">The order itself is not affected. Retry, check your order history, or contact the advisory desk.</p>
        <div className="portal-inline" style={{ marginTop: 18 }}>
          <button type="button" className="portal-btn portal-btn--gold" onClick={() => reset()}>Try again</button>
          <a className="portal-btn portal-btn--ghost" href="/account/orders">Order history</a>
          <a className="portal-btn portal-btn--ghost" href="/contact">Contact the desk</a>
        </div>
      </div>
    </div>
  );
}
