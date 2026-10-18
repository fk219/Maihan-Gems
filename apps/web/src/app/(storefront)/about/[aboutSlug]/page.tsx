/**
 * apps/web/src/app/(storefront)/about/[aboutSlug]/page.tsx
 *
 * `/about/<slug>` — target of observed /meet-our-team and /michael-arnstein
 * 301s and house heritage pages (SoT 13.1).
 */
import type { Metadata } from 'next';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ aboutSlug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { aboutSlug } = await params;
  const label = aboutSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    title: `${label} | About Maihan Gems`,
    description: 'Gemmological standards, bourse heritage, and master goldsmith leadership at Maihan Gems.',
  };
}

export default async function AboutDetailPage({ params }: PageProps) {
  const { aboutSlug } = await params;
  const title = aboutSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <main className="lx-section" id="main-content">
      <div className="lx-wrap lx-wrap--narrow">
        <span className="lx-kicker">The House · {title}</span>
        <h1 className="lx-h2">{title}</h1>
        <p className="lx-lede" style={{ marginTop: '1rem' }}>
          Maihan Gems operates between the Dubai International Financial Centre and the Bangkok Silom
          gemstone bourse, uniting direct rough and cut stone sourcing with master goldsmith fabrication.
        </p>

        <div className="lx-account-grid">
          <section className="lx-account-card">
            <h2 className="lx-account-card__title">Gemmological Discipline</h2>
            <p className="lx-account-note" style={{ margin: 0 }}>
              Every stone in the vault is catalogued with its observed weight, dimensions, cut geometry,
              and enhancement status. Unverified fields are never promoted to fact.
            </p>
          </section>
          <section className="lx-account-card">
            <h2 className="lx-account-card__title">Direct Bourse Custody</h2>
            <p className="lx-account-note" style={{ margin: 0 }}>
              From Ceylon and Kashmir sapphires to Colombian emeralds and Tanzanian zoisite, our gemmologists
              inspect each specimen under daylight-balanced and spectroscopic conditions prior to vault entry.
            </p>
          </section>
        </div>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '2rem' }}>
          <Link href="/browse" className="lx-btn lx-btn--solid">
            Explore the Vault
          </Link>
          <Link href="/showrooms" className="lx-btn lx-btn--ghost">
            View Private Salons
          </Link>
          <Link href="/about" className="lx-text-btn">
            ← About Maihan Gems
          </Link>
        </div>
      </div>
    </main>
  );
}
