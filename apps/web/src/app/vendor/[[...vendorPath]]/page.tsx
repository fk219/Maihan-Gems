/**
 * apps/web/src/app/vendor/[[...vendorPath]]/page.tsx
 *
 * The vendor portal, mounted from develop as-is.
 *
 * A static segment (`/vendor/login`) outranks this optional catch-all, so the
 * sign-in route renders without the guard and without a redirect loop. Every
 * other `/vendor/**` path requires a live session AND a vendor membership
 * (ADR-026, ADR-027); a signed-in user with no membership is redirected to the
 * sign-in route, and the portal's own probe (`/api/fresh/vendor/auth/me`)
 * answers 401/403 in exactly that case.
 */
import type { Metadata } from 'next';
import dynamicImport from 'next/dynamic';
import { redirect } from 'next/navigation';
import '../../../styles/mgh-applet.css';
import '../../../styles/portal-premium.css';
import { getVendorSession } from '../../../lib/vendor-session.js';

export const metadata: Metadata = {
  title: 'Vendor Portal | Maihan Gems',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const VendorShellMount = dynamicImport(
  () => import('../../../components/mgh/operator/VendorShellMount.js'),
  {
    loading: () => <div className="min-h-screen bg-[#F4F2EE]" />,
  },
);

export default async function VendorGatePage(): Promise<React.JSX.Element> {
  const session = await getVendorSession();
  if (session === null) redirect('/vendor/login');

  return <VendorShellMount />;
}
