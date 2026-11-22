/**
 * apps/web/src/app/vendor/layout.tsx
 *
 * BUILD_BACKLOG Track D — vendor portal chrome.
 *
 * Deliberately separate from the storefront: no header, mega menu, cart or
 * chat launcher, and every page is `noindex`. The portal is an operator
 * surface for vendors, not a shop window (ADR-026, ADR-027).
 */
import type { Metadata } from 'next';
import { VendorLogoutButton } from '../../components/vendor/VendorLogoutButton.js';
import { VENDOR_BRASS, VENDOR_INK, VENDOR_PAPER } from '../../components/vendor/styles.js';

export const metadata: Metadata = {
  title: 'Vendor portal — Maihan Gems',
  description: 'Vendor stock, orders and statements for Maihan Gems partners.',
  robots: { index: false, follow: false, nocache: true },
};

const NAV = [
  { href: '/vendor', label: 'Dashboard' },
  { href: '/vendor/products', label: 'Stock' },
  { href: '/vendor/orders', label: 'Orders' },
  { href: '/vendor/statement', label: 'Statement' },
] as const;

const FOCUS_CSS = `
  .mh-vendor a:focus-visible,
  .mh-vendor button:focus-visible,
  .mh-vendor input:focus-visible,
  .mh-vendor select:focus-visible,
  .mh-vendor textarea:focus-visible {
    outline: 2px solid ${VENDOR_BRASS};
    outline-offset: 2px;
  }
  .mh-vendor-skip {
    position: absolute;
    left: -9999px;
    top: 0;
  }
  .mh-vendor-skip:focus {
    left: 16px;
    top: 16px;
    z-index: 20;
    background: #FFFFFF;
    color: ${VENDOR_INK};
    padding: 10px 14px;
    border-radius: 6px;
    border: 1px solid ${VENDOR_BRASS};
  }
`;

export default function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="mh-vendor" style={{ minHeight: '100vh', background: VENDOR_PAPER, color: VENDOR_INK }}>
      <style>{FOCUS_CSS}</style>
      <a className="mh-vendor-skip" href="#vendor-main">
        Skip to content
      </a>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '18px',
          flexWrap: 'wrap',
          padding: '18px 28px',
          background: VENDOR_INK,
          color: '#FAFAF8',
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              fontSize: '10px',
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: VENDOR_BRASS,
            }}
          >
            Maihan Gems
          </p>
          <p
            style={{
              margin: '4px 0 0',
              fontFamily: 'Cormorant Garamond, Georgia, serif',
              fontSize: '20px',
            }}
          >
            Vendor Portal
          </p>
        </div>

        <nav aria-label="Vendor portal" style={{ display: 'flex', gap: '18px', flexWrap: 'wrap', fontSize: '13px' }}>
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              style={{
                color: '#FAFAF8',
                textDecoration: 'none',
                padding: '4px 0',
                borderBottom: `1px solid rgba(201,168,76,0.45)`,
              }}
            >
              {item.label}
            </a>
          ))}
          <VendorLogoutButton />
        </nav>
      </header>

      <main
        id="vendor-main"
        style={{ maxWidth: '1120px', margin: '0 auto', padding: '32px 24px 72px' }}
      >
        {children}
      </main>
    </div>
  );
}
