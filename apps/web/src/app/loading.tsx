/**
 * Root loading skeleton: design-system Skeleton primitives (never spinners),
 * announced by an aria-busy region for any suspended route segment.
 */
import { Skeleton } from '../components/design-system/Skeleton.js';

export default function RootLoading() {
  return (
    <div aria-busy="true" aria-live="polite" style={{ minHeight: '60vh', padding: '3rem 1.5rem' }}>
      <span className="visually-hidden">Loading…</span>
      <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'grid', gap: '1.25rem' }}>
        <Skeleton variant="text" width="min(420px, 70%)" height="2.5rem" />
        <Skeleton variant="text" width="min(560px, 85%)" height="1rem" />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: '1.25rem',
            marginTop: '2rem',
          }}
        >
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Skeleton key={i} variant="card" height="280px" width="100%" />
          ))}
        </div>
      </div>
    </div>
  );
}
