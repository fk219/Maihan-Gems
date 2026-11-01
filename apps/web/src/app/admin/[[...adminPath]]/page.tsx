import type { Metadata } from 'next';
import dynamicImport from 'next/dynamic';
import '../../../styles/mgh-applet.css';
import '../../../styles/portal-premium.css';

export const metadata: Metadata = {
  title: 'Admin Console | Maihan Gems',
  robots: { index: false, follow: false },
};

// Client-side only (session cookie probe); loaded through a client wrapper.
const AdminShellMount = dynamicImport(() => import('@/components/mgh/operator/AdminShellMount'), {
  loading: () => <div className="min-h-screen bg-[#F4F2EE]" />,
});

export default function AdminGatePage() {
  return <AdminShellMount />;
}
