/**
 * Root not-found boundary: useful navigation (browse, search, varieties hub,
 * home) with no internals echoed. Covers every unmatched storefront path.
 */
import Link from 'next/link';

export default function RootNotFound() {
  return (
    <main
      style={{
        minHeight: '70vh',
        display: 'grid',
        placeItems: 'center',
        padding: '4rem 1.5rem',
        background: 'var(--surface-base, #0A0A0B)',
        color: 'var(--ink-base, #F5F2E9)',
      }}
    >
      <section style={{ maxWidth: '560px', textAlign: 'center' }} role="status">
        <p className="eyebrow" style={{ letterSpacing: '0.2em', color: '#D4AF37' }}>
          404 · Not found
        </p>
        <h1 style={{ fontFamily: 'var(--font-serif, serif)', fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', margin: '1rem 0' }}>
          This page is not in the vault.
        </h1>
        <p style={{ opacity: 0.8 }}>
          It may have been sold, renamed, or the address may be incorrect.
        </p>
        <div
          style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginTop: '2rem',
          }}
        >
          <Link
            href="/browse"
            className="lx-btn lx-btn--solid"
            style={{ border: '1px solid #D4AF37', color: '#D4AF37', padding: '0.75rem 1.5rem', textDecoration: 'none' }}
          >
            Browse the vault
          </Link>
          <Link
            href="/search"
            className="lx-btn"
            style={{ border: '1px solid var(--hairline-border, #3a3a3d)', color: 'inherit', padding: '0.75rem 1.5rem', textDecoration: 'none' }}
          >
            Search gemstones
          </Link>
          <Link
            href="/"
            className="lx-btn"
            style={{ border: '1px solid var(--hairline-border, #3a3a3d)', color: 'inherit', padding: '0.75rem 1.5rem', textDecoration: 'none' }}
          >
            Return home
          </Link>
        </div>
      </section>
    </main>
  );
}
