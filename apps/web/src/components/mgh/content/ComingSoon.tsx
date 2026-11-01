import Link from 'next/link';
import { ArrowUpRight, Gem, Sparkles } from 'lucide-react';
import '../../../styles/portal-premium.css';
import { ClientSurface } from '@/components/mgh/providers/ClientSurface';

export function ComingSoon({
  title,
  blurb,
  backHref = '/',
  backLabel = 'Return to the maison',
}: {
  title: string;
  blurb: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <ClientSurface>
      <div className="client-frame">
        <div className="portal-top__where">
          <span>Maihan Gems</span>
          <span aria-hidden="true">/</span>
          <b>Editorial</b>
        </div>

        <div className="portal-card portal-card--pad" style={{ marginTop: 8 }}>
          <div className="portal-detail__head">
            <div>
              <p className="portal-kicker">The Maihan editorial</p>
              <h1 className="portal-page-title">{title}</h1>
              <p className="portal-page-sub" style={{ maxWidth: 620 }}>{blurb}</p>
            </div>
            <span className="portal-badge portal-badge--pending">In preparation</span>
          </div>
          <div className="portal-inline" style={{ marginTop: 20 }}>
            <Link href={backHref} className="portal-btn portal-btn--gold">{backLabel}</Link>
            <Link href="/contact" className="portal-btn portal-btn--ghost">Speak to the house <ArrowUpRight /></Link>
          </div>
        </div>

        <div className="client-split" style={{ marginTop: 16 }}>
          <div className="portal-card portal-card--pad">
            <p className="portal-label">While the page is prepared</p>
            <p className="client-note">
              This editorial surface is intentionally honest: no placeholder article, provenance claim or image is invented while the content is being prepared.
            </p>
            <div className="client-list" style={{ marginTop: 14 }}>
              <Link href="/browse" className="client-list__item" style={{ textDecoration: 'none' }}>
                <span className="client-list__main">
                  <span className="client-list__title">Browse the vault</span>
                  <span className="client-list__sub">Loose gemstones, pairs and settings</span>
                </span>
                <Gem style={{ width: 16, height: 16, color: 'var(--p-accent-deep)' }} />
              </Link>
              <Link href="/account" className="client-list__item" style={{ textDecoration: 'none' }}>
                <span className="client-list__main">
                  <span className="client-list__title">Your client atelier</span>
                  <span className="client-list__sub">Orders, saved pieces and addresses</span>
                </span>
                <ArrowUpRight style={{ width: 16, height: 16, color: 'var(--p-accent-deep)' }} />
              </Link>
            </div>
          </div>

          <div className="portal-card portal-card--pad">
            <p className="portal-kicker">Private client services</p>
            <p className="portal-page-sub" style={{ marginTop: 6 }}>
              The house arranges private viewings, bespoke commissions and provenance conversations personally.
            </p>
            <Link href="/contact" className="portal-btn portal-btn--gold portal-btn--sm" style={{ marginTop: 16 }}>
              <Sparkles /> Arrange a conversation
            </Link>
            <div className="client-divider" />
            <p className="client-note">
              For an existing order or a stone in your tray, your client atelier remains the fastest route to the house.
            </p>
          </div>
        </div>
      </div>
    </ClientSurface>
  );
}
