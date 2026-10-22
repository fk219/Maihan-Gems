/**
 * Root not-found boundary: useful navigation with no internals echoed.
 */
import Link from 'next/link';

export default function RootNotFound() {
  return (
    <main className="maison-missing" id="main-content">
      <section className="maison-missing__panel" role="status">
        <p className="page-eyebrow">Not found</p>
        <h1>This page is not in the vault.</h1>
        <p>It may have been sold, renamed, or the address may be incorrect.</p>
        <div className="maison-missing__actions">
          <Link href="/browse" className="lx-btn lx-btn--solid">
            Browse the vault
          </Link>
          <Link href="/search" className="lx-btn lx-btn--ghost">
            Search gemstones
          </Link>
          <Link href="/" className="lx-btn lx-btn--ghost">
            Return home
          </Link>
        </div>
      </section>
    </main>
  );
}
