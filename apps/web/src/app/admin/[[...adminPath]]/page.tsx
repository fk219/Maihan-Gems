/**
 * apps/web/src/app/admin/[[...adminPath]]/page.tsx
 *
 * The administrative console, mounted from develop as-is.
 *
 * The console itself is an operator surface (components/mgh/operator); this
 * page is the server-side door. Authorisation is not a UI concern: without a
 * live session whose user carries an administrative role the page redirects to
 * the sign-in route (ADR-027). The console's own probe (`/api/fresh/admin/stats`)
 * answers 401 in exactly the same case, so a direct API call is refused too.
 */
import type { Metadata } from 'next';
import dynamicImport from 'next/dynamic';
import { redirect } from 'next/navigation';
import '../../../styles/mgh-applet.css';
import '../../../styles/portal-premium.css';
import { getAdminSession } from '../../../lib/admin-session.js';

export const metadata: Metadata = {
  title: 'Admin Console | Maihan Gems',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

// Client-side only (session cookie probe); loaded through a client wrapper.
const AdminShellMount = dynamicImport(
  () => import('../../../components/mgh/operator/AdminShellMount.js'),
  {
    loading: () => <div className="min-h-screen bg-[#F4F2EE]" />,
  },
);

export default async function AdminGatePage(): Promise<React.JSX.Element> {
  const session = await getAdminSession();
  if (session === null) redirect('/admin/login');

  return <AdminShellMount />;
}
