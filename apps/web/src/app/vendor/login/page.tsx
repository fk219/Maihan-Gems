/**
 * apps/web/src/app/vendor/login/page.tsx
 *
 * D1 — the vendor sign-in surface.
 *
 * A static segment sits beside the portal pages, so this page renders without
 * the portal guard and therefore without a redirect loop. The form posts to
 * the shared session endpoint; membership is checked by `/api/v1/vendor/me`.
 */
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { VendorLoginForm } from '../../../components/vendor/VendorLoginForm.js';
import { VENDOR_INK, VENDOR_MUTED } from '../../../components/vendor/styles.js';
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
    <div
      style={{
        maxWidth: '520px',
        margin: '32px auto 0',
        background: '#FAFAF8',
        border: '1px solid rgba(201,168,76,0.35)',
        borderRadius: '14px',
        padding: '40px',
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: '11px',
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          color: VENDOR_MUTED,
        }}
      >
        Maihan Gems partners
      </p>
      <h1
        style={{
          margin: '8px 0 6px',
          fontFamily: 'Cormorant Garamond, Georgia, serif',
          fontSize: '32px',
          fontWeight: 500,
          color: VENDOR_INK,
        }}
      >
        Vendor sign in
      </h1>
      <p style={{ margin: '0 0 26px', fontSize: '13px', lineHeight: 1.6, color: VENDOR_MUTED }}>
        Use the account the platform linked to your vendor. Signing in is not enough on its own:
        the vendor must be approved before stock, orders and statements open.
      </p>
      <VendorLoginForm />
    </div>
  );
}
