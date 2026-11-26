/**
 * apps/web/src/app/not-found.tsx
 *
 * Root 404 for a URL that matches no route at all. It replaces the tree, so
 * it carries its own brand frame and two real exits.
 */
import Link from 'next/link';

export default function RootNotFound() {
  return (
    <main className="error-page">
      <div className="error-page__frame">
        <p className="error-page__brand">Maihan Gems</p>
        <p className="error-page__eyebrow">404</p>
        <h1 className="error-page__title">That address is not in the catalogue.</h1>
        <p className="error-page__body">
          It may have been sold, renamed, or the address may be incorrect. The varieties and the
          search index are the shortest way back to a real record.
        </p>
        <div className="error-page__actions">
          <Link href="/varieties" className="error-page__button">
            Browse the varieties
          </Link>
          <Link href="/search" className="error-page__button error-page__button--quiet">
            Search the catalogue
          </Link>
        </div>
        <p style={{ marginTop: 24 }}>
          <Link href="/" className="error-page__link">
            ← Return home
          </Link>
        </p>
      </div>
    </main>
  );
}
