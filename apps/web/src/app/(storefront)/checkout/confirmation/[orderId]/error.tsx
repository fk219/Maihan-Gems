'use client';

/**
 * Route-level error boundary for the order confirmation. Never invents an
 * order state: offers recovery via the bag and the account order history.
 */
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="page checkout-page">
      <div role="alert" className="checkout-shell">
        <span className="eyebrow">Order confirmation</span>
        <h1>We could not load this confirmation.</h1>
        <p className="page-subtitle">
          The order itself is not affected. Retry, check your order history, or contact the advisory desk.
        </p>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1.5rem' }}>
          <button type="button" className="btn-primary" onClick={() => reset()}>
            Try again
          </button>
          <a className="btn-secondary" href="/account/orders">
            Order history
          </a>
          <a className="btn-secondary" href="/contact">
            Contact the advisory desk
          </a>
        </div>
      </div>
    </main>
  );
}
