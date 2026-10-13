import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About | Maihan Gems',
  description: 'A private gemstone house for natural stones and atelier settings.',
};

export default function AboutPage() {
  return (
    <main className="lx-section">
      <div className="lx-wrap" style={{ maxWidth: 780 }}>
        <span className="lx-kicker">The house</span>
        <h1 className="lx-h2">Maihan Gems</h1>
        <p style={{ fontSize: '1.05rem', lineHeight: 1.8, color: '#4a4740', marginTop: '1.5rem' }}>
          Maihan is a private vault of earth-mined gemstones, matched pairs and master settings.
          Stones are disclosed as they are — origin, treatment and laboratory papers — never dressed as
          something they are not.
        </p>
        <p style={{ fontSize: '1.05rem', lineHeight: 1.8, color: '#4a4740', marginTop: '1rem' }}>
          Appointments in Dubai, Geneva, London and Bangkok. The atelier will pair a setting to a stone,
          or the reverse, and keep the composition honest.
        </p>
      </div>
    </main>
  );
}
