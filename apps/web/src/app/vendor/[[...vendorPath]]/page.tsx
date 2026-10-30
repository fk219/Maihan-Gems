import type { Metadata } from 'next';
import dynamicImport from 'next/dynamic';
import '../../../styles/mgh-applet.css';

export const metadata: Metadata = {
  title: 'Vendor Portal | Maihan Gems',
  robots: { index: false, follow: false },
};

const VendorPortalApp = dynamicImport(() => import('@/components/mgh/operator/VendorPortalApp'), {
  loading: () => <div className="min-h-screen bg-[#0A0A0B]" />,
});

export default function VendorGatePage() {
  return <VendorPortalApp />;
}
