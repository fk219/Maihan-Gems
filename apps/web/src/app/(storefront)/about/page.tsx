import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About | Maihan Gems',
  description: 'A private gemstone house for natural stones and atelier settings.',
};

export default function AboutPage() {
  return (
    <main className="lx-section" id="main-content">
      <div className="lx-wrap">
        <div className="salon-split">
          <div>
            <span className="lx-kicker">The house</span>
            <h1 className="lx-h2">Maihan Gems</h1>
            <p className="lx-lede" style={{ marginTop: '1.25rem' }}>
              Maihan is a private vault of earth-mined gemstones, matched pairs and master settings.
              Stones are disclosed as they are — origin, treatment and laboratory papers — never dressed
              as something they are not.
            </p>
            <p className="lx-lede" style={{ marginTop: '1rem' }}>
              Appointments in Dubai, Geneva, London and Bangkok. The atelier will pair a setting to a
              stone, or the reverse, and keep the composition honest.
            </p>
            <div className="maison-missing__actions">
              <Link href="/education" className="lx-btn lx-btn--solid">
                Read the notes
              </Link>
              <Link href="/contact" className="lx-btn lx-btn--ghost">
                Request a viewing
              </Link>
            </div>
          </div>
          <figure className="salon-figure">
            <img src="/media/jew-sapphire-pendant.jpg" alt="A sapphire pendant from the house collection" />
          </figure>
        </div>
      </div>
    </main>
  );
}
