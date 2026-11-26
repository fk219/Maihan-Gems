/**
 * apps/web/src/app/vendor/login/page.tsx
 *
 * D1 — the vendor sign-in surface.
 *
 * A static segment sits beside the portal pages, so this page renders without
 * the portal guard and therefore without a redirect loop. The frame is the
 * vendor portal's own palette: paper and ink, one brass rule, no storefront
 * chrome.
 */
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { VendorLoginForm } from '../../../components/vendor/VendorLoginForm.js';
import { VENDOR_BRASS, VENDOR_INK, VENDOR_MUTED, VENDOR_PAPER } from '../../../components/vendor/styles.js';
import { getVendorSession } from '../../../lib/vendor-session.js';

export const metadata: Metadata = {
  title: 'Vendor sign in — Maihan Gems',
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = 'force-dynamic';

export default async function VendorLoginPage(): Promise<React.JSX.Element> {
  const session = await getVendorSession();
  if (session !== null) redirect('/vendor');

  return (
    <section
      style={{
        maxWidth: '880px',
        margin: '16px auto 0',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        border: `1px solid rgba(201,168,76,0.4)`,
        background: '#FFFFFF',
      }}
      aria-labelledby="vendor-login-title"
    >
      <div
        style={{
          background: VENDOR_INK,
          color: VENDOR_PAPER,
          padding: 'clamp(28px, 5vw, 44px)',
          display: 'grid',
          alignContent: 'space-between',
          gap: '32px',
        }}
      >
        <p
          style={{
            margin: 0,
            fontFamily: 'Cormorant Garamond, Georgia, serif',
            fontSize: '20px',
            letterSpacing: '0.26em',
            textTransform: 'uppercase',
          }}
        >
          Maihan Gems
        </p>
        <div>
          <p
            style={{
              margin: '0 0 10px',
              fontSize: '9px',
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              color: VENDOR_BRASS,
            }}
          >
            Partners
          </p>
          <p style={{ margin: 0, fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '30px', lineHeight: 1.05 }}>
            The vendor portal
          </p>
          <p style={{ margin: '14px 0 0', fontSize: '12px', lineHeight: 1.8, color: 'rgba(246,244,239,0.66)' }}>
            Stock, orders and statements for the vendors who supply the atelier. Access is
            scoped to the vendor your account is linked to.
          </p>
        </div>
      </div>

      <div style={{ padding: 'clamp(28px, 5vw, 44px)' }}>
        <p style={{ margin: 0, fontSize: '9px', letterSpacing: '0.24em', textTransform: 'uppercase', color: '#7a5a10' }}>
          Vendor access
        </p>
        <h1
          id="vendor-login-title"
          style={{ margin: '8px 0 8px', fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '36px', fontWeight: 400, lineHeight: 1, color: VENDOR_INK }}
        >
          Sign in
        </h1>
        <p style={{ margin: '0 0 24px', fontSize: '12.5px', lineHeight: 1.7, color: VENDOR_MUTED }}>
          Use the account the platform linked to your vendor. Signing in is not enough on its
          own: the vendor must be approved before stock, orders and statements open.
        </p>
        <VendorLoginForm />
        <a
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            minHeight: '44px',
            marginTop: '18px',
            fontSize: '9px',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: VENDOR_MUTED,
            textDecoration: 'none',
          }}
        >
          ← Return to the storefront
        </a>
      </div>
    </section>
  );
}
